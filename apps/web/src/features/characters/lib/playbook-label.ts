import type { RulesetContent } from '@heist-mind/core';
import { BUILTIN_RULESETS } from '@heist-mind/shared';

/** Playbook id → name across the bundled systems (first wins), for list surfaces without content. */
const BUILTIN_PLAYBOOK_NAMES: ReadonlyMap<string, string> = (() => {
  const names = new Map<string, string>();
  for (const b of BUILTIN_RULESETS) {
    for (const p of b.content.playbooks ?? []) if (!names.has(p.id)) names.set(p.id, p.name);
  }
  return names;
})();

/**
 * The display name of a character's playbook (pixel review #12: lowercase ids like "lurk" /
 * "cutter" leaked into the roster, sheet and lists). Prefers the ruleset's own playbook name; when
 * the ruleset content isn't loaded on that surface (list queries return bare characters), falls
 * back to the bundled systems' name for that id (UX r3: lists said "Whisper" where the hub and
 * sheet said "The Whisper"), then to a title-cased id ("the-knife" → "The Knife").
 */
export function playbookLabel(
  id: string | null | undefined,
  content?: RulesetContent | null
): string {
  if (!id) return '';
  const named = content?.playbooks?.find(p => p.id === id)?.name;
  if (named) return named;
  const builtin = BUILTIN_PLAYBOOK_NAMES.get(id);
  if (builtin) return builtin;
  return id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
