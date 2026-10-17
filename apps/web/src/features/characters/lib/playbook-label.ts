import type { RulesetContent } from '@heist-mind/core';

/**
 * The display name of a character's playbook (pixel review #12: lowercase ids like "lurk" /
 * "cutter" leaked into the roster, sheet and lists). Prefers the ruleset's own playbook name; when
 * the ruleset content isn't loaded on that surface (list queries return bare characters), falls
 * back to a title-cased id ("hound" → "Hound", "the-knife" → "The Knife").
 */
export function playbookLabel(
  id: string | null | undefined,
  content?: RulesetContent | null
): string {
  if (!id) return '';
  const named = content?.playbooks?.find(p => p.id === id)?.name;
  if (named) return named;
  return id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
