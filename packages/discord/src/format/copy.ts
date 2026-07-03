// Every user-facing string the bot sends, in one place (the client owns its copy — same rule as
// the web app's i18n). English-only for now; keyed functions so a locale layer can slot in.
import type { RollOutcome } from '@heist-mind/core';

export const OUTCOME_LABEL: Record<RollOutcome, string> = {
  crit: 'Critical!',
  success: 'Full success',
  partial: 'Partial success',
  bad: 'Bad outcome',
};

export const copy = {
  rollTitle: (dice: number) => (dice === 0 ? 'Action roll — 0d (2d, take lowest)' : `Action roll — ${dice}d`),
  fortuneTitle: (dice: number) =>
    dice === 0 ? 'Fortune roll — 0d (2d, take lowest)' : `Fortune roll — ${dice}d`,
  resistTitle: (dice: number, attribute: string | null) =>
    `Resistance roll${attribute ? ` — ${attribute}` : ''}${dice === 0 ? ' — 0d (2d, take lowest)' : ` — ${dice}d`}`,
  faces: (results: number[]) => `[${results.join(', ')}]`,
  positionEffect: (position: string | null, effect: string | null) =>
    position && effect ? `${position} / ${effect}` : (position ?? effect ?? ''),
  resistCost: (stress: number) =>
    stress < 0
      ? 'Critical — **clear 1 stress**.'
      : stress === 0
        ? 'Resisted for free — **0 stress**.'
        : `Resisted — mark **${stress} stress**.`,
  diceTitle: (notation: string) => `Roll — ${notation}`,
  diceTotal: (total: number) => `Total: **${total}**`,
  diceInvalid:
    'Use NdM with optional modifier, e.g. `2d6`, `4d8+2`, `1d20-1` (max 100 dice, d1000).',
  unknownCommand: "I don't know that command. Try `/roll` or `/heist about`.",
  aboutTitle: 'HeistMind — the mechanical layer for Forged-in-the-Dark play',
  aboutBody: (siteUrl: string, sha: string) =>
    [
      `Rules-driven FitD dice, right here. Build characters and run campaigns at ${siteUrl}.`,
      '',
      'No data is stored for manual rolls — no account needed.',
      `Deployed: \`${sha}\``,
    ].join('\n'),
} as const;
