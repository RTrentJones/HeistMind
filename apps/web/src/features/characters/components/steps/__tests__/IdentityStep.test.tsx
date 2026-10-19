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

  // Round 6 P2-1 — RAW: a close friend AND a rival, two different people (real BitD content).
  it('vice: the rival list leaves out the close friend (and vice versa)', async () => {
    render(<IdentityStep step={step('vice')} />);
    const cutter = BLADES?.playbooks.find(p => p.id === 'cutter')?.contacts ?? [];
    expect(cutter.length).toBeGreaterThanOrEqual(2);
    const [first, second] = cutter;
    const friend = screen.getByRole('combobox', { name: /close friend/i });
    const rival = screen.getByRole('combobox', { name: /rival/i });
    await userEvent.selectOptions(friend, first!.name);
    const rivalOptions = () => Array.from((rival as HTMLSelectElement).options).map(o => o.value);
    expect(rivalOptions()).not.toContain(first!.name);
    expect(rivalOptions()).toContain(second!.name);
    await userEvent.selectOptions(rival, second!.name);
    const friendOptions = Array.from((friend as HTMLSelectElement).options).map(o => o.value);
    expect(friendOptions).not.toContain(second!.name);
    expect(store().draft.contacts.map(c => [c.relationship, c.name])).toEqual([
      ['friend', first!.name],
      ['rival', second!.name],
    ]);
  });

  it('contacts: name-only options, the chosen one described under the select (round 6 P2-3)', async () => {
    render(<IdentityStep step={step('vice')} />);
    const friend = screen.getByLabelText('Close friend');
    const contact = BLADES?.playbooks
      .find(p => p.id === 'cutter')
      ?.contacts?.find(c => c.description);
    if (!contact?.description) throw new Error('BitD Cutter has a described contact');
    // The option (and so the select's trigger) is just the name — no " — description" tail.
    expect(screen.getAllByRole('option', { name: contact.name }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('contact-friend-description')).toBeNull();
    await userEvent.selectOptions(friend, contact.name);
    const hint = screen.getByTestId('contact-friend-description');
    expect(hint).toHaveTextContent(contact.description);
    expect(friend).toHaveAttribute('aria-describedby', hint.id);
  });

  it('heritage (no listed choices) is ONE free-text field, not all three', async () => {
    render(<IdentityStep step={step('heritage')} />);
    expect(screen.getByLabelText('Heritage')).toBeInTheDocument();
    expect(screen.queryByLabelText('Vice')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Heritage'), 'Ore miners');
    expect(store().draft.heritage).toBe('Ore miners');
  });
});
