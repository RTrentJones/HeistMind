// Embed builders + the FitD outcome color language (mirrors the web's badge variants).
import type { APIEmbed } from 'discord-api-types/v10';
import type { RollOutcome } from '@heist-mind/core';
import { copy, OUTCOME_LABEL } from './copy';

export const OUTCOME_COLOR: Record<RollOutcome, number> = {
  crit: 0xd4af37, // gold
  success: 0x3fb950, // green
  partial: 0xd29922, // amber
  bad: 0xf85149, // red
};

const NEUTRAL_COLOR = 0x8b949e;

export function rollEmbed(input: {
  title: string;
  results: number[];
  outcome?: RollOutcome;
  detail?: string;
  note?: string;
}): APIEmbed {
  const lines = [copy.faces(input.results)];
  if (input.detail) lines.push(input.detail);
  if (input.note) lines.push(`_${input.note}_`);
  return {
    title: input.title,
    description: lines.join('\n'),
    color: input.outcome ? OUTCOME_COLOR[input.outcome] : NEUTRAL_COLOR,
    ...(input.outcome ? { fields: [{ name: 'Outcome', value: OUTCOME_LABEL[input.outcome] }] } : {}),
  };
}
