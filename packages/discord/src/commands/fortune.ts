// /fortune — the GM's odds roll; same FitD resolution, no position/effect stakes.
import { diceForRating, rollOutcome } from '@heist-mind/core';
import { copy } from '../format/copy';
import { rollEmbed } from '../format/embeds';
import { integerOption, stringOption } from '../options';
import { inline, replyEmbed } from '../respond';
import type { CommandHandler } from '../types';

export const handleFortune: CommandHandler = (ctx, interaction) => {
  const dice = integerOption(interaction, 'dice') ?? 0;
  const note = stringOption(interaction, 'note');

  const { count, zeroDice } = diceForRating(dice);
  const results = ctx.realize(count);

  return inline(replyEmbed(
    rollEmbed({
      title: copy.fortuneTitle(dice),
      results,
      outcome: rollOutcome(results, { zeroDice }),
      ...(note ? { note } : {}),
    })
  ));
};
