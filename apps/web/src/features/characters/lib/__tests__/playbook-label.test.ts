import { describe, expect, it } from 'vitest';
import type { RulesetContent } from '@heist-mind/core';
import { DEFAULT_RULESET } from '@heist-mind/shared';
import { playbookLabel } from '../playbook-label';

describe('playbookLabel (pixel review #12 — no raw playbook ids)', () => {
  it("prefers the ruleset's playbook name", () => {
    const pb = DEFAULT_RULESET.playbooks[0];
    expect(pb).toBeDefined();
    if (pb) expect(playbookLabel(pb.id, DEFAULT_RULESET)).toBe(pb.name);
  });

  it('title-cases the id when the ruleset is not loaded on that surface', () => {
    expect(playbookLabel('lurk')).toBe('Lurk');
    expect(playbookLabel('the-knife', { playbooks: [] } as unknown as RulesetContent)).toBe(
      'The Knife'
    );
    expect(playbookLabel(null)).toBe('');
  });
});
