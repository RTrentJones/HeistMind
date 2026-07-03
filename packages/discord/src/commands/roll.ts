// /roll — the FitD action roll (manual pool in Phase 0; the sheet-aware form arrives in Phase 1).
import { diceForRating, rollOutcome } from '@heist-mind/core';
import { copy } from '../format/copy';
import { rollEmbed } from '../format/embeds';
import { integerOption, stringOption } from '../options';
import { replyEmbed } from '../respond';
import type { CommandHandler } from '../types';

export const handleRoll: CommandHandler = (ctx, interaction) => {
  const dice = integerOption(interaction, 'dice') ?? 0;
  const position = stringOption(interaction, 'position');
  const effect = stringOption(interaction, 'effect');
  const note = stringOption(interaction, 'note');

  // Rating 0 rolls two dice and takes the LOWEST (never a crit) — the FitD zero-dice rule.
  const { count, zeroDice } = diceForRating(dice);
  const results = ctx.realize(count);
  const outcome = rollOutcome(results, { zeroDice });

  return replyEmbed(
    rollEmbed({
      title: copy.rollTitle(dice),
      results,
      outcome,
      detail: copy.positionEffect(position, effect),
      ...(note ? { note } : {}),
    })
  );
};
