// The Phase-3 character-sheet commands — /stress, /harm, /vice, /xp — thin wrappers over the
// engine use-cases (the ownership gate and the campaign-feed logging live THERE; these handlers
// resolve the actor's active character, realize dice where needed, and phrase the outcome).
// All public: they're table-facing gameplay events, and in a DM "public" is just you.
import { stressBounds, type CharacterWithDetails, type HarmLevel } from '@heist-mind/core';
import {
  advanceCharacter,
  applyStress,
  clearHarm,
  indulgeVice,
  markXp,
  takeHarm,
  viceDicePool,
} from '@heist-mind/engine';
import type {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandInteraction,
  APIApplicationCommandOptionChoice,
} from 'discord-api-types/v10';
import { copy } from '../format/copy';
import { rollEmbed } from '../format/embeds';
import { basicOptions, integerOption, stringOption, subcommandName } from '../options';
import { deferred } from '../respond';
import type { BotContext, CommandHandler, FollowUpClient } from '../types';
import { activeCharacter } from './roll';

const HARM_LEVELS: readonly HarmLevel[] = ['lesser', 'moderate', 'severe'];

function asHarmLevel(value: string | null): HarmLevel | null {
  return HARM_LEVELS.find(l => l === value) ?? null;
}

/** The shared prelude: repos + the actor's active character, or a delete+ephemeral failure. */
async function requireCharacter(
  ctx: BotContext,
  interaction: APIApplicationCommandInteraction,
  followUp: FollowUpClient
): Promise<CharacterWithDetails | null> {
  const failEphemeral = async (content: string): Promise<null> => {
    await followUp.deleteOriginal();
    await followUp.sendEphemeral(content);
    return null;
  };
  if (!ctx.repos) return failEphemeral(copy.notConfigured);
  const character = await activeCharacter(ctx, interaction);
  if (!character) return failEphemeral(copy.noActiveCharacter);
  return character;
}

async function failEphemeral(followUp: FollowUpClient, content: string): Promise<void> {
  await followUp.deleteOriginal();
  await followUp.sendEphemeral(content);
}

/** /stress add|clear — a clamped delta on the active character's track. */
export const handleStress: CommandHandler = (ctx, interaction) => {
  const sub = subcommandName(interaction);
  const amount = integerOption(interaction, 'amount') ?? 1;
  const delta = sub === 'clear' ? -amount : amount;

  return deferred(async followUp => {
    const character = await requireCharacter(ctx, interaction, followUp);
    if (!character || !ctx.repos) return;
    const out = await applyStress(ctx.repos, {
      characterId: character.id,
      userId: character.createdBy,
      stress: delta,
    });
    if (!out.success) return failEphemeral(followUp, copy.somethingBroke);
    const max = stressBounds(character.ruleset.content).max;
    const content = out.data
      ? copy.stressLine(character.name, out.data.characterData.stress, max)
      : copy.stressUnchanged(character.name);
    return followUp.editOriginal({ content });
  });
};

/** /harm take|clear — engine takeHarm (RAW escalation) / clearHarm, both feed-logged. */
export const handleHarm: CommandHandler = (ctx, interaction) => {
  const sub = subcommandName(interaction);
  const level = asHarmLevel(stringOption(interaction, 'level'));

  return deferred(async followUp => {
    const character = await requireCharacter(ctx, interaction, followUp);
    if (!character || !ctx.repos) return;
    const repos = ctx.repos;
    if (!level) return failEphemeral(followUp, copy.unknownCommand);

    if (sub === 'take') {
      const description = stringOption(interaction, 'description')?.trim() ?? '';
      if (!description) return failEphemeral(followUp, copy.unknownCommand);
      const out = await takeHarm(repos, {
        characterId: character.id,
        userId: character.createdBy,
        level,
        description,
        logLabel: character.name,
        logNote: applied => copy.harmLogTaken(applied, description),
      });
      if (!out.success) {
        return failEphemeral(
          followUp,
          out.error.code === 'HARM_FULL' ? copy.harmFull : copy.somethingBroke
        );
      }
      const applied = out.data.appliedLevel;
      const line = copy.harmTaken(character.name, applied, description);
      const escalated = applied !== level ? ` ${copy.harmEscalated(level, applied)}` : '';
      return followUp.editOriginal({ content: `${line}${escalated}` });
    }

    if (sub === 'clear') {
      const entry = stringOption(interaction, 'entry')?.trim() ?? '';
      const out = await clearHarm(repos, {
        characterId: character.id,
        userId: character.createdBy,
        level,
        description: entry,
        logLabel: character.name,
        logNote: copy.harmLogCleared(level, entry),
      });
      if (!out.success) {
        return failEphemeral(
          followUp,
          out.error.code === 'HARM_NOT_FOUND' ? copy.harmNotFound(entry) : copy.somethingBroke
        );
      }
      return followUp.editOriginal({ content: copy.harmCleared(character.name, entry) });
    }

    return failEphemeral(followUp, copy.unknownCommand);
  });
};

/** /vice indulge — roll the lowest-attribute pool, clear that much stress (overindulgence flagged). */
export const handleVice: CommandHandler = (ctx, interaction) => {
  return deferred(async followUp => {
    const character = await requireCharacter(ctx, interaction, followUp);
    if (!character || !ctx.repos) return;
    const pool = viceDicePool(character);
    const results = ctx.realize(pool.count);
    const out = await indulgeVice(ctx.repos, {
      character,
      userId: character.createdBy,
      results,
      zeroDice: pool.zeroDice,
      logLabel: copy.viceLog,
    });
    if (!out.success) return failEphemeral(followUp, copy.somethingBroke);
    const max = stressBounds(character.ruleset.content).max;
    const embed = rollEmbed({
      title: copy.viceTitle(character.name, pool.zeroDice ? 0 : pool.count),
      results,
      detail: copy.viceCleared(out.data.cleared, out.data.nextStress, max),
      ...(out.data.overindulged ? { note: copy.viceOverindulged } : {}),
    });
    return followUp.editOriginal({ embeds: [embed] });
  });
};

/** Decode an `/xp advance` pick (`ability:<id>` / `skill:<id>`) against the character's ruleset. */
function decodePick(
  character: CharacterWithDetails,
  pick: string
): { advancement: Parameters<typeof advanceCharacter>[1]['advancement']; what: string; logNote: string } | null {
  const content = character.ruleset.content;
  const [kind, id] = pick.split(':', 2);
  if (kind === 'ability' && id) {
    const def = content.specialAbilities.find(a => a.id === id);
    if (!def) return null;
    const cost =
      content.advancement?.advancementOptions?.find(o => o.category === 'ability')?.cost ?? 1;
    return {
      advancement: { type: 'ability', target: def.id, cost, description: `Learn ${def.name}` },
      what: copy.learnAbility(def.name),
      logNote: copy.xpLogAbility(def.name),
    };
  }
  if (kind === 'skill' && id) {
    const def = (content.skills ?? []).find(s => s.id === id);
    if (!def) return null;
    return {
      advancement: {
        type: 'skill',
        target: def.id,
        value: 1,
        cost: 0,
        description: `Add a dot to ${def.name}`,
      },
      what: copy.actionDot(def.name),
      logNote: copy.xpLogDot(def.name),
    };
  }
  return null;
}

/** /xp mark|advance — the XP economy through the engine (both are logged feed events). */
export const handleXp: CommandHandler = (ctx, interaction) => {
  const sub = subcommandName(interaction);

  return deferred(async followUp => {
    const character = await requireCharacter(ctx, interaction, followUp);
    if (!character || !ctx.repos) return;
    const repos = ctx.repos;

    if (sub === 'mark') {
      const amount = integerOption(interaction, 'amount') ?? 1;
      const reason = stringOption(interaction, 'reason')?.trim() || copy.xpReasonDefault;
      const out = await markXp(repos, {
        characterId: character.id,
        userId: character.createdBy,
        amount,
        reason,
        logLabel: character.name,
        logNote: copy.xpLogMark(amount),
      });
      if (!out.success) return failEphemeral(followUp, copy.somethingBroke);
      return followUp.editOriginal({
        content: copy.xpMarked(character.name, amount, out.data.experiencePoints),
      });
    }

    if (sub === 'advance') {
      const pick = stringOption(interaction, 'pick') ?? '';
      const decoded = decodePick(character, pick);
      if (!decoded) return failEphemeral(followUp, copy.xpPickInvalid);
      const out = await advanceCharacter(repos, {
        characterId: character.id,
        userId: character.createdBy,
        advancement: decoded.advancement,
        logLabel: character.name,
        logNote: decoded.logNote,
      });
      // The repository gates cost/prereq/track — its message is the useful part of a refusal.
      if (!out.success) return failEphemeral(followUp, copy.xpAdvanceFailed(out.error.message));
      return followUp.editOriginal({ content: copy.xpAdvanced(character.name, decoded.what) });
    }

    return failEphemeral(followUp, copy.unknownCommand);
  });
};

const typedValue = (interaction: APIApplicationCommandAutocompleteInteraction, name: string) =>
  basicOptions(interaction as unknown as APIApplicationCommandInteraction)
    .find(o => o.name === name)
    ?.value?.toString()
    .toLowerCase() ?? '';

/** Suggest current harm entries for `/harm clear entry:` — scoped to the picked level. */
export async function harmAutocomplete(
  ctx: BotContext,
  interaction: APIApplicationCommandAutocompleteInteraction
): Promise<APIApplicationCommandOptionChoice[]> {
  try {
    const character = await activeCharacter(ctx, interaction);
    if (!character) return [];
    const harm = character.characterData.harm ?? { lesser: [], moderate: [], severe: [] };
    const level = asHarmLevel(
      stringOption(interaction as unknown as APIApplicationCommandInteraction, 'level')
    );
    const typed = typedValue(interaction, 'entry');
    const entries = level ? harm[level] : HARM_LEVELS.flatMap(l => harm[l]);
    return [...new Set(entries)]
      .filter(e => e.toLowerCase().includes(typed))
      .slice(0, 25)
      .map(e => ({ name: e, value: e }));
  } catch {
    return [];
  }
}

/** Suggest buyable advances for `/xp advance pick:` — unowned abilities + action dots. */
export async function xpAutocomplete(
  ctx: BotContext,
  interaction: APIApplicationCommandAutocompleteInteraction
): Promise<APIApplicationCommandOptionChoice[]> {
  try {
    const character = await activeCharacter(ctx, interaction);
    if (!character) return [];
    const content = character.ruleset.content;
    const owned = character.characterData.specialAbilities;
    const typed = typedValue(interaction, 'pick');
    const abilities = content.specialAbilities
      .filter(a => !owned.includes(a.id))
      .map(a => ({ name: `Learn ${a.name}`, value: `ability:${a.id}` }));
    const dots = (content.skills ?? []).map(s => {
      const rating = character.characterData.skills[s.id] ?? 0;
      return { name: `+1 ${s.name} dot (${rating}→${rating + 1})`, value: `skill:${s.id}` };
    });
    return [...abilities, ...dots]
      .filter(c => c.name.toLowerCase().includes(typed))
      .slice(0, 25);
  } catch {
    return [];
  }
}
