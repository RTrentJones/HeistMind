// The Phase-3 GM commands — /score, /crew, /clock, /faction — the campaign-state levers, run
// against the LINKED campaign (guild-context only) behind the GM gate. Thin wrappers over the
// engine use-cases (which persist AND feed-log each change); successes post publicly, failures
// are ephemeral and leak nothing to non-GMs.
import { advanceTier, type Game } from '@heist-mind/core';
import {
  advanceCrewTier,
  applyCrewHeat,
  endScore,
  incarcerateCrew,
  setFactionStatus,
  startScore,
  tickClock,
} from '@heist-mind/engine';
import type {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandInteraction,
  APIApplicationCommandOptionChoice,
} from 'discord-api-types/v10';
import type { DatabaseRepositories } from '@heist-mind/database';
import { isGM, resolveActor } from '../authz';
import { copy } from '../format/copy';
import { linkCandidates, resolveLinkedGame } from '../links';
import { integerOption, stringOption, subcommandName, typedOptionValue } from '../options';
import { deferred, failEphemeral, inline, reply } from '../respond';
import type { BotContext, CommandHandler, FollowUpClient } from '../types';
import { discordUserId } from './character';

/** GM commands act on a linked SERVER surface — a DM answers the guild-only hint inline. */
const guildGate = () => inline(reply(copy.guildOnly, { ephemeral: true }));

interface GmContext {
  repos: DatabaseRepositories;
  actorId: string;
  game: Game;
}

/** The shared GM prelude: linked game + GM gate, or a delete+ephemeral failure (null). */
async function gmContext(
  ctx: BotContext,
  interaction: APIApplicationCommandInteraction,
  followUp: FollowUpClient
): Promise<GmContext | null> {
  const failEphemeral = async (content: string): Promise<null> => {
    await followUp.deleteOriginal();
    await followUp.sendEphemeral(content);
    return null;
  };
  if (!ctx.repos) return failEphemeral(copy.notConfigured);
  const userId = discordUserId(interaction);
  if (!userId) return failEphemeral(copy.unknownCommand);
  const actor = await resolveActor(ctx.repos, userId);
  if (!actor) return failEphemeral(copy.signInFirst(ctx.siteUrl));
  const game = await resolveLinkedGame(ctx.repos, interaction);
  if (!game) return failEphemeral(copy.notLinked);
  if (!(await isGM(ctx.repos, actor.id, game.id))) return failEphemeral(copy.gmOnly);
  return { repos: ctx.repos, actorId: actor.id, game };
}

/** /score start|end — the operation lifecycle (one active at a time, repo-enforced). */
export const handleScore: CommandHandler = (ctx, interaction) => {
  if (!linkCandidates(interaction)) return guildGate();
  const sub = subcommandName(interaction);

  return deferred(async followUp => {
    const gm = await gmContext(ctx, interaction, followUp);
    if (!gm) return;

    if (sub === 'start') {
      const name = stringOption(interaction, 'name')?.trim() || undefined;
      const out = await startScore(gm.repos, {
        gameId: gm.game.id,
        userId: gm.actorId,
        ...(name !== undefined ? { name } : {}),
        logLabel: name ?? gm.game.name,
        logNote: copy.scoreLogStart,
      });
      if (!out.success) return failEphemeral(followUp, copy.gmActionFailed(out.error.message));
      return followUp.editOriginal({ content: copy.scoreStarted(out.data.name) });
    }

    if (sub === 'end') {
      const active = await gm.repos.scores.findActive(gm.game.id);
      if (!active.success) return failEphemeral(followUp, copy.somethingBroke);
      if (!active.data) return failEphemeral(followUp, copy.noActiveScore);
      const out = await endScore(gm.repos, {
        gameId: gm.game.id,
        userId: gm.actorId,
        scoreId: active.data.id,
        logLabel: active.data.name ?? gm.game.name,
        logNote: copy.scoreLogEnd,
      });
      if (!out.success) return failEphemeral(followUp, copy.gmActionFailed(out.error.message));
      return followUp.editOriginal({ content: copy.scoreEnded(out.data.name) });
    }

    return failEphemeral(followUp, copy.unknownCommand);
  });
};

/** /crew heat|tier|incarcerate — crew progression through the rules (heat cascade, tier, jail). */
export const handleCrew: CommandHandler = (ctx, interaction) => {
  if (!linkCandidates(interaction)) return guildGate();
  const sub = subcommandName(interaction);

  return deferred(async followUp => {
    const gm = await gmContext(ctx, interaction, followUp);
    if (!gm) return;
    const found = await gm.repos.crews.findByGame(gm.game.id);
    if (!found.success) return failEphemeral(followUp, copy.somethingBroke);
    if (!found.data) return failEphemeral(followUp, copy.noCrew);
    const crew = found.data;
    const crewName = crew.name ?? gm.game.name;

    const done = (updated: { tier: number; heat: number; wanted: number }) =>
      followUp.editOriginal({
        content: `**${crewName}** — ${copy.statusCrewLine(updated.tier, updated.heat, updated.wanted)}.`,
      });

    if (sub === 'heat') {
      const amount = integerOption(interaction, 'amount') ?? 1;
      const out = await applyCrewHeat(gm.repos, {
        crew,
        userId: gm.actorId,
        amount,
        logLabel: crewName,
        logNote: copy.crewLogHeat(amount),
      });
      if (!out.success) return failEphemeral(followUp, copy.somethingBroke);
      return done(out.data);
    }

    if (sub === 'tier') {
      // The rule no-ops on an unfilled Rep track — refuse HERE so no misleading feed event lands.
      if (advanceTier({ tier: crew.tier, rep: crew.rep }).tier === crew.tier) {
        return failEphemeral(followUp, copy.crewTierNotReady(crew.rep));
      }
      const out = await advanceCrewTier(gm.repos, {
        crew,
        userId: gm.actorId,
        logLabel: crewName,
        logNote: copy.crewLogTier,
      });
      if (!out.success) return failEphemeral(followUp, copy.somethingBroke);
      return done(out.data);
    }

    if (sub === 'incarcerate') {
      const out = await incarcerateCrew(gm.repos, {
        crew,
        userId: gm.actorId,
        logLabel: crewName,
        logNote: copy.crewLogIncarcerate,
      });
      if (!out.success) return failEphemeral(followUp, copy.somethingBroke);
      return done(out.data);
    }

    return failEphemeral(followUp, copy.unknownCommand);
  });
};

/** Match an autocomplete-submitted id first, a hand-typed name second. */
function pickByIdOrName<T extends { id: string; name: string }>(list: T[], typed: string): T | null {
  return (
    list.find(x => x.id === typed) ??
    list.find(x => x.name.toLowerCase() === typed.toLowerCase()) ??
    null
  );
}

/** /clock tick — advance (or wind back) a clock; FILLING it announces the milestone. */
export const handleClock: CommandHandler = (ctx, interaction) => {
  if (!linkCandidates(interaction)) return guildGate();

  return deferred(async followUp => {
    const gm = await gmContext(ctx, interaction, followUp);
    if (!gm) return;
    const typed = stringOption(interaction, 'clock')?.trim() ?? '';
    const clocks = await gm.repos.clocks.findByGame(gm.game.id);
    if (!clocks.success) return failEphemeral(followUp, copy.somethingBroke);
    const clock = pickByIdOrName(clocks.data, typed);
    if (!clock) return failEphemeral(followUp, copy.clockNotFound(typed));

    const delta = integerOption(interaction, 'segments') ?? 1;
    const out = await tickClock(gm.repos, {
      clock,
      userId: gm.actorId,
      delta,
      logLabel: clock.name,
      logNote: copy.clockLogFilled(clock.name),
    });
    if (!out.success) return failEphemeral(followUp, copy.somethingBroke);
    const line = copy.clockTicked(clock.name, out.data.clock.filled, out.data.clock.segments);
    return followUp.editOriginal({
      content: out.data.completed ? `${line} ${copy.clockCompleted}` : line,
    });
  });
};

/** /faction status — set a faction's standing toward the crew (−3 war … +3 allied). */
export const handleFaction: CommandHandler = (ctx, interaction) => {
  if (!linkCandidates(interaction)) return guildGate();

  return deferred(async followUp => {
    const gm = await gmContext(ctx, interaction, followUp);
    if (!gm) return;
    const typed = stringOption(interaction, 'faction')?.trim() ?? '';
    const factions = await gm.repos.factions.findByGame(gm.game.id);
    if (!factions.success) return failEphemeral(followUp, copy.somethingBroke);
    const faction = pickByIdOrName(factions.data, typed);
    if (!faction) return failEphemeral(followUp, copy.factionNotFound(typed));

    const status = integerOption(interaction, 'status') ?? 0;
    const label = copy.factionStatusFmt(status);
    const out = await setFactionStatus(gm.repos, {
      faction,
      userId: gm.actorId,
      status,
      logLabel: faction.name,
      logNote: copy.factionLogStatus(label),
    });
    if (!out.success) return failEphemeral(followUp, copy.somethingBroke);
    return followUp.editOriginal({
      content: copy.factionSet(faction.name, copy.factionStatusFmt(out.data.status)),
    });
  });
};

/** The GM-gated linked-game resolution shared by the /clock and /faction suggesters. */
async function gmGame(
  ctx: BotContext,
  interaction: APIApplicationCommandAutocompleteInteraction
): Promise<{ repos: DatabaseRepositories; game: Game } | null> {
  const userId = discordUserId(interaction);
  if (!ctx.repos || !userId) return null;
  const actor = await resolveActor(ctx.repos, userId);
  if (!actor) return null;
  const game = await resolveLinkedGame(ctx.repos, interaction);
  if (!game) return null;
  // Autocomplete must not leak campaign state to non-GMs — same gate as the handlers.
  if (!(await isGM(ctx.repos, actor.id, game.id))) return null;
  return { repos: ctx.repos, game };
}

/** Suggest the linked campaign's clocks for `/clock tick clock:` (GM-gated; value = id). */
export async function clockAutocomplete(
  ctx: BotContext,
  interaction: APIApplicationCommandAutocompleteInteraction
): Promise<APIApplicationCommandOptionChoice[]> {
  try {
    const gm = await gmGame(ctx, interaction);
    if (!gm) return [];
    const clocks = await gm.repos.clocks.findByGame(gm.game.id);
    if (!clocks.success) return [];
    const typed = typedOptionValue(interaction as unknown as APIApplicationCommandInteraction, 'clock');
    return clocks.data
      .filter(c => c.name.toLowerCase().includes(typed))
      .slice(0, 25)
      .map(c => ({ name: `${c.name} (${c.filled}/${c.segments})`, value: c.id }));
  } catch {
    return [];
  }
}

/** Suggest the linked campaign's factions for `/faction status faction:` (GM-gated; value = id). */
export async function factionAutocomplete(
  ctx: BotContext,
  interaction: APIApplicationCommandAutocompleteInteraction
): Promise<APIApplicationCommandOptionChoice[]> {
  try {
    const gm = await gmGame(ctx, interaction);
    if (!gm) return [];
    const factions = await gm.repos.factions.findByGame(gm.game.id);
    if (!factions.success) return [];
    const typed = typedOptionValue(interaction as unknown as APIApplicationCommandInteraction, 'faction');
    return factions.data
      .filter(f => f.name.toLowerCase().includes(typed))
      .slice(0, 25)
      .map(f => ({ name: `${f.name} (${copy.factionStatusFmt(f.status)})`, value: f.id }));
  } catch {
    return [];
  }
}
