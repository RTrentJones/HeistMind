// F94 — after a successful create the wizard draft is cleared, so the next character on the same
// ruleset starts at step 1 instead of resuming the one just created at its Confirm step.
import { describe, expect, it, vi } from 'vitest';
import type { Ruleset, RulesetContent } from '@heist-mind/core';
import { getBuiltinById } from '@heist-mind/shared';
import { useAuthStore } from '@/features/auth/stores/auth-store';

vi.mock('@/features/characters/data/api', () => ({
  createCharacterWithValidation: vi.fn().mockResolvedValue({ id: 'new-char' }),
}));

import { useCharacterCreationStore } from '../character-creation-store';

const BRACKWATER: RulesetContent = getBuiltinById('brackwater')!.content;
const ruleset = { id: 'rs-bw', name: 'Brackwater', version: '1', content: BRACKWATER } as Ruleset;

describe('submit()', () => {
  it('clears the spent draft on success (a second character starts fresh)', async () => {
    useAuthStore.setState({ user: { id: 'u1' } as never });
    const s = useCharacterCreationStore;
    s.getState().reset();
    s.getState().initFromRuleset(ruleset);
    s.getState().setName('First Knife');
    s.setState({ stepIndex: 5, canSubmit: () => true });

    expect(await s.getState().submit()).toBe('new-char');
    expect(s.getState().name).toBe('');
    expect(s.getState().stepIndex).toBe(0);

    // Re-entering the wizard on the same ruleset does NOT resurrect the old draft.
    s.getState().initFromRuleset(ruleset);
    expect(s.getState().name).toBe('');
    expect(s.getState().stepIndex).toBe(0);
  });
});
