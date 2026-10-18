// Round-3 #4 — BitD identity: the vice step offers the seven vices as choices plus a details /
// purveyor field; heritage (no listed choices) is a single free-text field. Real BitD content.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Ruleset } from '@heist-mind/core';
import { getBuiltinById } from '@heist-mind/shared';
import '@/lib/i18n';
import { useCharacterCreationStore } from '../../../stores/character-creation-store';
import { IdentityStep } from '../IdentityStep';

const BLADES = getBuiltinById('blades-in-the-dark')?.content;
const step = (id: string) => BLADES?.characterCreation.steps.find(s => s.id === id);
const store = () => useCharacterCreationStore.getState();

beforeEach(() => {
  store().reset();
  store().initFromRuleset({ id: 'bitd', content: BLADES } as unknown as Ruleset);
  store().setPlaybook('cutter');
});

describe('IdentityStep (BitD)', () => {
  it('vice: the seven vices as choices + a details & purveyor field', async () => {
    render(<IdentityStep step={step('vice')} />);
    for (const vice of ['Faith', 'Gambling', 'Luxury', 'Obligation', 'Pleasure', 'Stupor', 'Weird'])
      expect(screen.getByText(vice)).toBeInTheDocument();
    await userEvent.click(screen.getByText('Gambling'));
    expect(store().draft.vice).toBe('Gambling');
    await userEvent.type(screen.getByLabelText('Vice details & purveyor'), 'Old Mags');
    expect(store().draft.viceDetail).toBe('Old Mags');
  });

  it('heritage (no listed choices) is ONE free-text field, not all three', async () => {
    render(<IdentityStep step={step('heritage')} />);
    expect(screen.getByLabelText('Heritage')).toBeInTheDocument();
    expect(screen.queryByLabelText('Vice')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Heritage'), 'Ore miners');
    expect(store().draft.heritage).toBe('Ore miners');
  });
});
