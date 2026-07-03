// Embed builders + the FitD outcome color language (mirrors the web's badge variants).
import type { APIEmbed } from 'discord-api-types/v10';
import { stressBounds, type CharacterWithDetails, type RollOutcome } from '@heist-mind/core';
import { copy, OUTCOME_LABEL } from './copy';

export const OUTCOME_COLOR: Record<RollOutcome, number> = {
  crit: 0xd4af37, // gold
  success: 0x3fb950, // green
  partial: 0xd29922, // amber
  bad: 0xf85149, // red
};

const NEUTRAL_COLOR = 0x8b949e;

/** The /character show sheet card: identity + the live-condition numbers a table asks about. */
export function characterSheetEmbed(character: CharacterWithDetails): APIEmbed {
  const data = character.characterData;
  const content = character.ruleset.content;
  const playbookName =
    content.playbooks.find(p => p.id === data.playbook)?.name ?? data.playbook;
  const bounds = stressBounds(content);
  const harm = data.harm ?? { lesser: [], moderate: [], severe: [] };
  const harmLine =
    [...harm.severe, ...harm.moderate, ...harm.lesser].join(', ') || copy.sheetNoHarm;
  return {
    title: character.name,
    description: character.game ? copy.sheetInCampaign(character.game.name) : copy.sheetStandalone,
    color: NEUTRAL_COLOR,
    fields: [
      { name: copy.sheetPlaybook, value: playbookName, inline: true },
      {
        name: copy.sheetStress,
        value: `${data.stress}/${bounds.max}` + (data.trauma.length > 0 ? ` · ${data.trauma.join(', ')}` : ''),
        inline: true,
      },
      { name: copy.sheetCoin, value: `${data.coins ?? 0} coin · ${data.stash ?? 0} stash`, inline: true },
      { name: copy.sheetHarm, value: harmLine },
    ],
  };
}

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
