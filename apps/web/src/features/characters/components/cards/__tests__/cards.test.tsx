import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CharacterData, RulesetContent } from '@heist-mind/core';
import '@/lib/i18n';
import { GearCard } from '../GearCard';
import { HarmCard } from '../HarmCard';

// Minimal BitD-shaped ruleset: defaults fill stress/harm bounds; named trauma set for the picker.
const CONTENT = {
  metadata: { name: 'Test', version: '1', author: '', description: '', system: 'fitd' },
  playbooks: [],
  attributes: [],
  characterCreation: { steps: [] },
  traumaConditions: ['Cold', 'Haunted'],
} as unknown as RulesetContent;

const DATA = {
  playbook: 'cutter',
  attributes: {},
  skills: {},
  specialAbilities: [],
  stress: 3,
  trauma: ['Cold'],
  harm: { lesser: ['Bruised'], moderate: [], severe: [] },
  contacts: [{ name: 'Marlane', description: '', relationship: 'friend' }],
  coins: 2,
  stash: 5,
} as unknown as CharacterData;

describe('HarmCard', () => {
  it('view mode shows harm entries and trauma badges, no edit controls', () => {
    render(<HarmCard content={CONTENT} data={DATA} />);
    expect(screen.getByText('Cold')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('edit mode toggles a named trauma through onPatch', async () => {
    const onPatch = vi.fn();
    render(<HarmCard content={CONTENT} data={DATA} edit={{ onPatch }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Haunted' }));
    expect(onPatch).toHaveBeenCalledWith({ trauma: ['Cold', 'Haunted'] });
  });
});

describe('GearCard', () => {
  it('view mode shows coin, stash, and contacts', () => {
    render(<GearCard data={DATA} />);
    expect(screen.getByText(/2/)).toBeInTheDocument();
    expect(screen.getByText(/Marlane/)).toBeInTheDocument();
  });

  it('view mode renders nothing when there is no gear to show', () => {
    const empty = { ...DATA, coins: 0, stash: 0, contacts: [] } as CharacterData;
    const { container } = render(<GearCard data={empty} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('edit mode patches coin changes into the draft', async () => {
    const onPatch = vi.fn();
    render(<GearCard data={DATA} edit={{ playbookContacts: [], onPatch }} />);
    const coins = screen.getAllByRole('spinbutton')[0]!;
    await userEvent.clear(coins);
    await userEvent.type(coins, '7');
    expect(onPatch).toHaveBeenCalled();
  });
});
