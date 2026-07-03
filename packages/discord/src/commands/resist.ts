// /resist — the FitD resistance roll: stress = 6 − highest die; a CRITICAL clears 1 (RAW).
// Phase 0 is display-only (no account, nothing persisted) — the player marks their own sheet.
import { diceForRating, resistanceStress, rollOutcome } from '@heist-mind/core';
import { copy } from '../format/copy';
import { rollEmbed } from '../format/embeds';
import { integerOption, stringOption } from '../options';
import { inline, replyEmbed } from '../respond';
import type { CommandHandler } from '../types';

export const handleResist: CommandHandler = (ctx, interaction) => {
  const dice = integerOption(interaction, 'dice') ?? 0;
  const attribute = stringOption(interaction, 'attribute');

  const { count, zeroDice } = diceForRating(dice);
  const results = ctx.realize(count);
  const stress = resistanceStress(results, { zeroDice });

  return inline(replyEmbed(
    rollEmbed({
      title: copy.resistTitle(dice, attribute),
      results,
      outcome: rollOutcome(results, { zeroDice }),
      detail: copy.resistCost(stress),
    })
  ));
};
