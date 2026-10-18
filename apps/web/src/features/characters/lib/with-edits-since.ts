import type { CharacterData } from '@heist-mind/core';

/**
 * The saved row, plus any top-level field the player changed AFTER submitting (the editor stays
 * interactive while a save is in flight) — those later edits stay in the draft, still unsaved.
 */
export function withEditsSince(
  submitted: CharacterData,
  current: CharacterData,
  saved: CharacterData
): CharacterData {
  const before = submitted as unknown as Record<string, unknown>;
  const now = current as unknown as Record<string, unknown>;
  const next = structuredClone(saved) as unknown as Record<string, unknown>;
  for (const key of new Set([...Object.keys(before), ...Object.keys(now)])) {
    if (JSON.stringify(before[key]) !== JSON.stringify(now[key])) next[key] = now[key];
  }
  return next as unknown as CharacterData;
}
