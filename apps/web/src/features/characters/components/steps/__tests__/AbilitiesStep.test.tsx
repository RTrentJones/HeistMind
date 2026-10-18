// The wizard's ability picker offers exactly what the store's toggle accepts: on a single-slot
// roster a click SWAPS, so a repeat Veteran can't be offered in place of the Veteran it requires.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Ruleset } from '@heist-mind/core';
import { getBuiltinById } from '@heist-mind/shared';
import '@/lib/i18n';
import { useCharacterCreationStore } from '../../../stores/character-creation-store';
import { AbilitiesStep } from '../AbilitiesStep';

const BLADES = getBuiltinById('blades-in-the-dark')!.content;

const card = (name: string) => screen.getByText(name).closest('[role="button"]')!;

describe('AbilitiesStep — single-slot swaps', () => {
  it('Veteran (second) stays locked while Veteran is the roster pick it would replace', () => {
    const store = useCharacterCreationStore.getState();
    store.initFromRuleset({ id: 'bitd', content: BLADES } as unknown as Ruleset);
    store.setPlaybook('cutter');
    store.toggleAbility('veteran');
    render(<AbilitiesStep />);
    expect(card('Veteran')).toHaveAttribute('aria-pressed', 'true');
    expect(card('Veteran (second)')).toHaveAttribute('aria-disabled', 'true');
    // An ordinary roster ability is still a legal swap.
    expect(card('Mule')).toHaveAttribute('aria-disabled', 'false');
  });
});
