import { describe, expect, it } from 'vitest';
import type { RulesetContent } from '@heist-mind/core';
import { BUILTIN_RULESETS, DEFAULT_RULESET } from '@heist-mind/shared';
import { playbookLabel } from '../playbook-label';

describe('playbookLabel (pixel review #12 — no raw playbook ids)', () => {
  it("prefers the ruleset's playbook name", () => {
    const pb = DEFAULT_RULESET.playbooks[0];
    expect(pb).toBeDefined();
    if (pb) expect(playbookLabel(pb.id, DEFAULT_RULESET)).toBe(pb.name);
  });

  it("uses the bundled system's name when the ruleset is not loaded (no 'Whisper' vs 'The Whisper')", () => {
    const blades = BUILTIN_RULESETS.find(b => b.id === 'blades-in-the-dark')?.content;
    const whisper = blades?.playbooks.find(p => p.id === 'whisper');
    expect(whisper).toBeDefined();
    if (whisper) {
      expect(playbookLabel('whisper')).toBe(whisper.name);
      expect(playbookLabel('whisper')).toBe(playbookLabel('whisper', blades));
    }
  });

  it('title-cases an id no ruleset knows', () => {
    expect(playbookLabel('house-ghost')).toBe('House Ghost');
    expect(playbookLabel('night_owl', { playbooks: [] } as unknown as RulesetContent)).toBe(
      'Night Owl'
    );
    expect(playbookLabel(null)).toBe('');
  });
});
