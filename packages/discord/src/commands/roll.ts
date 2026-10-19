// /roll — the FitD action roll. Two forms:
//   manual  — `/roll dice:N` (Phase 0): pure compute, inline reply, no account needed.
//   sheet   — `/roll action:<name>` (Phase 1/2): the ACTIVE character's rating from their own
//             ruleset, plus `extra` (assists/bargains) and `push` (+1d). In a LINKED channel
//             where the actor is a member and their active character is in that campaign, the
//             roll PERSISTS via the engine (repo recomputes the outcome from the faces —
//             anti-forge — and push charges its real 2 stress). Otherwise display-only with a
//             footer saying why.
import {
  diceForRating,
  harmDicePenalty,
  rollOutcome,
  rulesetActions,
  worstHarmLevel,
  xpTrackSize,
  type CharacterWithDetails,
} from '@heist-mind/core';
import { rollAction } from '@heist-mind/engine';
import type {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandInteraction,
  APIApplicationCommandOptionChoice,
} from 'discord-api-types/v10';
import { isMember, resolveActor } from '../authz';
import { copy } from '../format/copy';
import { rollEmbed } from '../format/embeds';
import { resolveLinkedGame } from '../links';
import { basicOptions, booleanOption, integerOption, stringOption } from '../options';
import { deferred, failEphemeral, inline, reply, replyEmbed } from '../respond';
import type { BotContext, CommandHandler } from '../types';
import { discordUserId } from './character';
import { TRAUMA_LOG, traumaReply } from './trauma';

/**
 * Match a typed action name against the ruleset's CANONICAL action list — `rulesetActions`
 * (names collected from `attributes[].skills`), the same source the web sheet and the validator
 * use. Ratings are keyed by that NAME in `characterData.skills`. (The top-level `content.skills`
 * DEFINITIONS are optional flavor — the default ruleset ships with them empty; F69.)
 */
function resolveAction(character: CharacterWithDetails, typed: string): string | null {
  return (
    rulesetActions(character.ruleset.content).find(
      name => name.toLowerCase() === typed.toLowerCase()
    ) ?? null
  );
}

/** Load the actor's active character with details (the shared sheet lookup). */
export async function activeCharacter(
  ctx: BotContext,
  interaction: Pick<APIApplicationCommandInteraction, 'member' | 'user'>
): Promise<CharacterWithDetails | null> {
  const userId = discordUserId(interaction);
  if (!ctx.repos || !userId) return null;
  const actor = await resolveActor(ctx.repos, userId);
  if (!actor) return null;
  const pointer = await ctx.repos.discordPlayers.getActiveCharacterId(actor.id);
  if (!pointer.success || !pointer.data) return null;
  const details = await ctx.repos.characters.findWithDetails(pointer.data);
  if (!details.success || !details.data || details.data.createdBy !== actor.id) return null;
  return details.data;
}

export const handleRoll: CommandHandler = (ctx, interaction) => {
  const dice = integerOption(interaction, 'dice');
  const action = stringOption(interaction, 'action');
  const position = stringOption(interaction, 'position');
  const effect = stringOption(interaction, 'effect');
  const note = stringOption(interaction, 'note');
  // RAW bonus dice (action-roll step 5): +1d from an ASSIST, and +1d from EITHER pushing yourself
  // OR a devil's bargain — "you can't get dice for both". So at most +2d, never push + bargain.
  const push = booleanOption(interaction, 'push') === true;
  const bargain = booleanOption(interaction, 'bargain') === true;
  const assist = booleanOption(interaction, 'assist') === true;
  if (push && bargain) return inline(reply(copy.rollPushAndBargain, { ephemeral: true }));
  // `bonus:` is the ±Nd an ability sets on this roll (Ambush +1d from hiding…) — situational prose
  // the player claims, kept apart from the push/bargain exclusion above.
  const bonus = integerOption(interaction, 'bonus') ?? 0;
  const extra = (push || bargain ? 1 : 0) + (assist ? 1 : 0) + bonus;
  const moveNotes = [
    ...(bargain ? [copy.bargainNote] : []),
    ...(assist ? [copy.assistNote] : []),
    ...(bonus !== 0 ? [copy.abilityDiceNote(bonus)] : []),
  ];

  const finish = (title: string, pool: number, rollNote?: string) => {
    const { count, zeroDice } = diceForRating(pool);
    const results = ctx.realize(count);
    return rollEmbed({
      title,
      results,
      outcome: rollOutcome(results, { zeroDice }),
      detail: copy.positionEffect(position, effect),
      ...(rollNote ? { note: rollNote } : {}),
    });
  };

  // Sheet form: the active character's rating (DB reads → defer publicly; rolls face the table).
  if (action) {
    return deferred(async followUp => {
      if (!ctx.repos) return failEphemeral(followUp, copy.notConfigured);
      const repos = ctx.repos;
      const character = await activeCharacter(ctx, interaction);
      if (!character) return failEphemeral(followUp, copy.rollNeedsActiveCharacter(ctx.siteUrl));
      const resolved = resolveAction(character, action);
      if (!resolved) return failEphemeral(followUp, copy.unknownAction(action));

      const rating = character.characterData.skills[resolved] ?? 0;
      // F43 — moderate harm costs a die, RAW; the sheet is the source of truth in both clients
      // (the web panel applies the same penalty); a claimed `bonus:` can offset it.
      const harmPenalty = harmDicePenalty(character.characterData);
      const pool = rating + extra - harmPenalty;
      const { count, zeroDice } = diceForRating(pool);
      const results = ctx.realize(count);

      // Phase 2: persist when this surface is linked, the actor is a member, and the active
      // character belongs to THAT campaign. Anything else stays display-only with the reason.
      let footer: string;
      let pushNote: string | null = push ? copy.pushedReminder : null;
      let traumaLine: string | null = null;
      let desperateNote: string | null = null;
      const persistedNote = [...moveNotes, ...(note ? [note] : [])].join(' · ');
      const game = await resolveLinkedGame(repos, interaction, ctx.fetchChannelParent);
      if (!game) {
        footer = copy.notLoggedNotLinked;
      } else if (!(await isMember(repos, character.createdBy, game.id))) {
        footer = copy.notLoggedNotMember;
      } else if (character.gameId !== game.id) {
        footer = copy.notLoggedWrongCampaign;
      } else {
        const logged = await rollAction(repos, {
          gameId: game.id,
          userId: character.createdBy,
          characterId: character.id,
          kind: 'action',
          label: resolved,
          // A desperate action roll marks XP in this action's attribute (the engine does it, RAW)
          // and logs it to the campaign (web parity, round 5 P2-8).
          action: resolved,
          desperateXpLog: (track, amount) =>
            copy.desperateXpLog(
              track === null
                ? null
                : (character.ruleset.content.attributes.find(a => a.id === track)?.name ?? track),
              amount
            ),
          dice: count,
          results,
          zeroDice,
          ...(position ? { position } : {}),
          ...(effect ? { effect } : {}),
          ...(persistedNote ? { note: persistedNote } : {}),
          pushed: push,
          traumaLog: TRAUMA_LOG,
        });
        if (!logged.success) return failEphemeral(followUp, copy.somethingBroke);
        footer = copy.loggedFooter(game.name);
        const xp = logged.data.desperateXp;
        if (xp?.track) {
          const content = character.ruleset.content;
          const attr = content.attributes.find(a => a.id === xp.track);
          const size = xpTrackSize(content, xp.track);
          desperateNote = xp.trackFull
            ? copy.desperateXpFull(attr?.name ?? xp.track, size)
            : copy.desperateXp(attr?.name ?? xp.track, xp.marks, size);
        } else if (logged.data.desperateXpError) {
          // The roll is logged; only its XP side effect failed — say that, not "something broke".
          desperateNote = copy.desperateXpFailed;
        }
        if (push && logged.data.stressError) {
          pushNote = copy.stressNotMarked(2); // the roll is logged; its stress write failed
        } else if (push) {
          pushNote = copy.pushedCharged; // the engine really charged the 2 stress
          // Announce what the engine APPLIED (live row + crew boxes), never a local prediction.
          const applied = logged.data.pushStress;
          if (applied?.trauma) traumaLine = traumaReply(ctx, character, applied.mustRetire);
        }
      }

      const harmNotes = [
        ...(harmPenalty > 0 ? [copy.harmPenaltyNote] : []),
        ...(worstHarmLevel(character.characterData) === 'severe' ? [copy.severeHarmNote] : []),
      ];
      const noteParts = [
        ...harmNotes,
        ...(pushNote ? [pushNote] : []),
        ...(desperateNote ? [desperateNote] : []),
        ...moveNotes,
        ...(note ? [note] : []),
      ];
      const embed = rollEmbed({
        title: copy.sheetRollTitle(character.name, resolved, rating, extra - harmPenalty),
        results,
        outcome: rollOutcome(results, { zeroDice }),
        detail: copy.positionEffect(position, effect),
        ...(noteParts.length > 0 ? { note: noteParts.join(' · ') } : {}),
        footer,
      });
      return followUp.editOriginal({
        embeds: [embed],
        ...(traumaLine ? { content: traumaLine } : {}),
      });
    });
  }

  // Manual form: pure compute, inline. The title shows the TOTAL pool (dice + bonus dice).
  if (dice === null) return inline(reply(copy.rollNeedsDiceOrAction, { ephemeral: true }));
  const pool = Math.max(0, dice + extra);
  const manualNotes = [
    ...(push ? [copy.pushedReminder] : []),
    ...moveNotes,
    ...(note ? [note] : []),
  ];
  return inline(
    replyEmbed(
      finish(
        copy.rollTitle(pool),
        pool,
        manualNotes.length > 0 ? manualNotes.join(' · ') : undefined
      )
    )
  );
};

/** Suggest the ACTIVE character's actions for `/roll action:` — degrades to [] on any trouble. */
export async function rollAutocomplete(
  ctx: BotContext,
  interaction: APIApplicationCommandAutocompleteInteraction
): Promise<APIApplicationCommandOptionChoice[]> {
  try {
    const character = await activeCharacter(ctx, interaction);
    if (!character) return [];
    const typed =
      basicOptions(interaction as unknown as APIApplicationCommandInteraction)
        .find(o => o.name === 'action')
        ?.value?.toString()
        .toLowerCase() ?? '';
    return rulesetActions(character.ruleset.content)
      .filter(name => name.toLowerCase().includes(typed))
      .slice(0, 25)
      .map(name => {
        const rating = character.characterData.skills[name] ?? 0;
        return { name: `${name} (${rating}d)`, value: name };
      });
  } catch {
    return [];
  }
}
