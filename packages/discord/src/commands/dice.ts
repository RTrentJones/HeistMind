// /dice — the one generic utility: NdM(±k) notation for everything that isn't a FitD pool.
import { copy } from '../format/copy';
import { rollEmbed } from '../format/embeds';
import { stringOption } from '../options';
import { reply, replyEmbed } from '../respond';
import type { BotContext, CommandHandler } from '../types';

const NOTATION = /^(\d{1,3})d(\d{1,4})([+-]\d{1,4})?$/i;
const MAX_DICE = 100;
const MAX_SIDES = 1000;

/** Parse `NdM[+/-k]`; null when malformed or out of bounds. Exported for tests. */
export function parseNotation(
  raw: string
): { count: number; sides: number; modifier: number } | null {
  const match = NOTATION.exec(raw.trim());
  if (!match || !match[1] || !match[2]) return null;
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;
  if (count < 1 || count > MAX_DICE || sides < 2 || sides > MAX_SIDES) return null;
  return { count, sides, modifier };
}

export function makeDiceHandler(
  realizeDice: (count: number, sides: number) => number[]
): CommandHandler {
  return (_ctx: BotContext, interaction) => {
    const notation = stringOption(interaction, 'notation') ?? '';
    const parsed = parseNotation(notation);
    if (!parsed) return reply(copy.diceInvalid, { ephemeral: true });

    const results = realizeDice(parsed.count, parsed.sides);
    const total = results.reduce((sum, r) => sum + r, 0) + parsed.modifier;
    return replyEmbed(
      rollEmbed({
        title: copy.diceTitle(notation.trim()),
        results,
        detail: copy.diceTotal(total),
      })
    );
  };
}
