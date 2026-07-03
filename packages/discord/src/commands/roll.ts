// /roll — the FitD action roll. Two forms:
//   manual  — `/roll dice:N` (Phase 0): pure compute, inline reply, no account needed.
//   sheet   — `/roll action:<name>` (Phase 1): the ACTIVE character's rating from their own
//             ruleset, plus `extra` (assists/bargains) and `push` (+1d; copy-only reminder to
//             mark 2 stress until Phase 2 persists rolls). DB reads → deferred, public.
import { diceForRating, rollOutcome, type CharacterWithDetails } from '@heist-mind/core';
import type {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandInteraction,
  APIApplicationCommandOptionChoice,
} from 'discord-api-types/v10';
import { resolveActor } from '../authz';
import { copy } from '../format/copy';
import { rollEmbed } from '../format/embeds';
import { basicOptions, booleanOption, integerOption, stringOption } from '../options';
import { deferred, inline, reply, replyEmbed } from '../respond';
import type { BotContext, CommandHandler } from '../types';
import { discordUserId } from './character';

/** Match a typed action name to the ruleset's action list; returns [id, displayName] or null. */
function resolveAction(
  character: CharacterWithDetails,
  typed: string
): { id: string; name: string } | null {
  const skills = character.ruleset.content.skills ?? [];
  const match = skills.find(s => s.name.toLowerCase() === typed.toLowerCase());
  return match ? { id: match.id, name: match.name } : null;
}

/** Load the actor's active character with details (the shared sheet lookup). */
async function activeCharacter(
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
  const extra = integerOption(interaction, 'extra') ?? 0;
  const push = booleanOption(interaction, 'push') === true;

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
      const failEphemeral = async (content: string): Promise<void> => {
        await followUp.deleteOriginal();
        await followUp.sendEphemeral(content);
      };
      if (!ctx.repos) return failEphemeral(copy.notConfigured);
      const character = await activeCharacter(ctx, interaction);
      if (!character) return failEphemeral(copy.rollNeedsActiveCharacter(ctx.siteUrl));
      const resolved = resolveAction(character, action);
      if (!resolved) return failEphemeral(copy.unknownAction(action));

      const rating = character.characterData.skills[resolved.id] ?? 0;
      const pool = rating + extra + (push ? 1 : 0);
      const noteParts = [...(push ? [copy.pushedReminder] : []), ...(note ? [note] : [])];
      const embed = finish(
        copy.sheetRollTitle(character.name, resolved.name, rating, extra, push),
        pool,
        noteParts.length > 0 ? noteParts.join(' · ') : undefined
      );
      return followUp.editOriginal({ embeds: [embed] });
    });
  }

  // Manual form: pure compute, inline. The title shows the TOTAL pool (dice + extra + push).
  if (dice === null) return inline(reply(copy.rollNeedsDiceOrAction, { ephemeral: true }));
  const pool = dice + extra + (push ? 1 : 0);
  const manualNotes = [...(push ? [copy.pushedReminder] : []), ...(note ? [note] : [])];
  return inline(
    replyEmbed(
      finish(copy.rollTitle(pool), pool, manualNotes.length > 0 ? manualNotes.join(' · ') : undefined)
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
    return (character.ruleset.content.skills ?? [])
      .filter(s => s.name.toLowerCase().includes(typed))
      .slice(0, 25)
      .map(s => {
        const rating = character.characterData.skills[s.id] ?? 0;
        return { name: `${s.name} (${rating}d)`, value: s.name };
      });
  } catch {
    return [];
  }
}
