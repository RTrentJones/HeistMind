// /resist — the FitD resistance roll: stress = 6 − highest die; a CRITICAL clears 1 (RAW).
// In a DM (or without repos) it stays the Phase-0 display-only roll on a typed `dice:` pool — the
// player marks their own sheet. In a guild channel it defers and, when the surface is linked + the
// actor is a member + their active character is in that campaign, PERSISTS via the engine. That
// persisted form rolls the character's OWN attribute rating from the sheet (RAW: "1d for each
// Attribute rating" — review #6), never a typed count, so the stress written to the sheet comes
// from dice the sheet actually grants. Anything less rolls display-only with a footer saying why.
// `bonus:` applies the ±Nd an ability or crew upgrade sets on a resistance (Iron Will +1, a
// Daredevil −1): those are situational prose, so the player claims them and the embed shows it.
import {
  deriveAttributes,
  usesActionRatings,
  diceForRating,
  resistanceStress,
  rollOutcome,
  type CharacterWithDetails,
} from '@heist-mind/core';
import { rollResistance } from '@heist-mind/engine';
import { isMember } from '../authz';
import { copy } from '../format/copy';
import { rollEmbed } from '../format/embeds';
import { resolveLinkedGame } from '../links';
import { integerOption, stringOption } from '../options';
import { deferred, failEphemeral, inline, reply, replyEmbed } from '../respond';
import type { BotContext, CommandHandler } from '../types';
import { activeCharacter } from './roll';
import { TRAUMA_LOG, traumaReply } from './trauma';

/** Match a typed attribute (id or name, any case) against the character's ruleset. */
function resolveAttribute(
  character: CharacterWithDetails,
  typed: string | null
): { id: string; name: string } | null {
  if (!typed) return null;
  const t = typed.trim().toLowerCase();
  return (
    (character.ruleset.content.attributes ?? []).find(
      a => a.id.toLowerCase() === t || a.name.toLowerCase() === t
    ) ?? null
  );
}

/** Roll a pool and build the embed pieces. */
function rollPool(ctx: BotContext, rating: number) {
  const { count, zeroDice } = diceForRating(rating);
  const results = ctx.realize(count);
  return { count, zeroDice, results, stress: resistanceStress(results, { zeroDice }) };
}

export const handleResist: CommandHandler = (ctx, interaction) => {
  const dice = integerOption(interaction, 'dice');
  const attribute = stringOption(interaction, 'attribute');
  const bonus = integerOption(interaction, 'bonus') ?? 0;

  const embed = (
    rating: number,
    label: string | null,
    roll: ReturnType<typeof rollPool>,
    detail: string,
    footer?: string
  ) =>
    rollEmbed({
      title: copy.resistTitle(rating, label),
      results: roll.results,
      outcome: rollOutcome(roll.results, { zeroDice: roll.zeroDice }),
      detail,
      ...(bonus !== 0 ? { note: copy.abilityDiceNote(bonus) } : {}),
      ...(footer ? { footer } : {}),
    });

  // Only a guild channel can be a linked surface — DMs stay pure-compute, no account needed.
  const guildId = 'guild_id' in interaction ? interaction.guild_id : undefined;
  if (!guildId || !ctx.repos) {
    if (dice === null) return inline(reply(copy.resistNeedsDice, { ephemeral: true }));
    const roll = rollPool(ctx, Math.max(0, dice + bonus));
    return inline(
      replyEmbed(embed(Math.max(0, dice + bonus), attribute, roll, copy.resistCost(roll.stress)))
    );
  }

  const repos = ctx.repos;
  return deferred(async followUp => {
    const displayOnly = async (footer: string) => {
      if (dice === null) return failEphemeral(followUp, copy.resistNeedsDice);
      const roll = rollPool(ctx, Math.max(0, dice + bonus));
      return followUp.editOriginal({
        embeds: [
          embed(Math.max(0, dice + bonus), attribute, roll, copy.resistCost(roll.stress), footer),
        ],
      });
    };

    const game = await resolveLinkedGame(repos, interaction, ctx.fetchChannelParent);
    if (!game) return displayOnly(copy.notLoggedNotLinked);
    const character = await activeCharacter(ctx, interaction);
    if (!character) return displayOnly(copy.notLoggedNoCharacter);
    if (!(await isMember(repos, character.createdBy, game.id))) {
      return displayOnly(copy.notLoggedNotMember);
    }
    if (character.gameId !== game.id) return displayOnly(copy.notLoggedWrongCampaign);

    // Persisting: the dice come from the sheet's attribute rating, not the typed `dice:`.
    const attr = resolveAttribute(character, attribute);
    if (!attr) {
      const names = (character.ruleset.content.attributes ?? []).map(a => a.name);
      return failEphemeral(followUp, copy.resistNeedsAttribute(names));
    }
    // Same rating the sheet shows: derived from action dots in an action-ratings ruleset, the stored
    // attribute in a point-buy one (where no rated actions exist to derive from).
    const content = character.ruleset.content;
    const rating =
      (usesActionRatings(content)
        ? deriveAttributes(content, character.characterData)[attr.id]
        : character.characterData.attributes[attr.id]) ?? 0;
    const pool = Math.max(0, rating + bonus);
    const roll = rollPool(ctx, pool);

    const logged = await rollResistance(repos, {
      gameId: game.id,
      userId: character.createdBy,
      characterId: character.id,
      label: attr.name,
      dice: roll.count,
      results: roll.results,
      zeroDice: roll.zeroDice,
      traumaLog: TRAUMA_LOG,
    });
    if (!logged.success) return failEphemeral(followUp, copy.somethingBroke);
    return followUp.editOriginal({
      embeds: [
        embed(
          pool,
          attr.name,
          roll,
          copy.resistCharged(character.name, logged.data.stress),
          copy.loggedFooter(game.name)
        ),
      ],
      ...(logged.data.trauma
        ? { content: traumaReply(ctx, character, logged.data.mustRetire) }
        : {}),
    });
  });
};
