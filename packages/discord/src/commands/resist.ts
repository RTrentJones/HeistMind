// /resist — the FitD resistance roll: stress = 6 − highest die; a CRITICAL clears 1 (RAW).
// In a DM (or without repos) it stays the Phase-0 display-only roll — the player marks their own
// sheet. In a guild channel it defers and, when the surface is linked + the actor is a member +
// their active character is in that campaign, PERSISTS via the engine (the stress delta lands on
// the sheet and the roll in the campaign log). Anything less rolls display-only with a footer
// saying why it wasn't logged.
import { diceForRating, resistanceStress, rollOutcome } from '@heist-mind/core';
import { rollResistance } from '@heist-mind/engine';
import { isMember } from '../authz';
import { copy } from '../format/copy';
import { rollEmbed } from '../format/embeds';
import { resolveLinkedGame } from '../links';
import { integerOption, stringOption } from '../options';
import { deferred, inline, replyEmbed } from '../respond';
import type { CommandHandler } from '../types';
import { activeCharacter } from './roll';

export const handleResist: CommandHandler = (ctx, interaction) => {
  const dice = integerOption(interaction, 'dice') ?? 0;
  const attribute = stringOption(interaction, 'attribute');

  const { count, zeroDice } = diceForRating(dice);
  const results = ctx.realize(count);
  const stress = resistanceStress(results, { zeroDice });

  const embed = (detail: string, footer?: string) =>
    rollEmbed({
      title: copy.resistTitle(dice, attribute),
      results,
      outcome: rollOutcome(results, { zeroDice }),
      detail,
      ...(footer ? { footer } : {}),
    });

  // Only a guild channel can be a linked surface — DMs stay pure-compute, no account needed.
  const guildId = 'guild_id' in interaction ? interaction.guild_id : undefined;
  if (!guildId || !ctx.repos) return inline(replyEmbed(embed(copy.resistCost(stress))));

  const repos = ctx.repos;
  return deferred(async followUp => {
    const displayOnly = (footer: string) =>
      followUp.editOriginal({ embeds: [embed(copy.resistCost(stress), footer)] });

    const game = await resolveLinkedGame(repos, interaction, ctx.fetchChannelParent);
    if (!game) return displayOnly(copy.notLoggedNotLinked);
    const character = await activeCharacter(ctx, interaction);
    if (!character) return displayOnly(copy.notLoggedNoCharacter);
    if (!(await isMember(repos, character.createdBy, game.id))) {
      return displayOnly(copy.notLoggedNotMember);
    }
    if (character.gameId !== game.id) return displayOnly(copy.notLoggedWrongCampaign);

    const logged = await rollResistance(repos, {
      gameId: game.id,
      userId: character.createdBy,
      characterId: character.id,
      ...(attribute ? { label: attribute } : {}),
      dice: count,
      results,
      zeroDice,
    });
    if (!logged.success) {
      await followUp.deleteOriginal();
      return followUp.sendEphemeral(copy.somethingBroke);
    }
    return followUp.editOriginal({
      embeds: [
        embed(copy.resistCharged(character.name, logged.data.stress), copy.loggedFooter(game.name)),
      ],
    });
  });
};
