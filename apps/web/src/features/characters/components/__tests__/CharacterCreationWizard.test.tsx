// F99 (round-4 pixel P1-1/P1-6/P2-16) — the wizard on real BitD content (fixture provenance):
// - the blocking reason is its own full-width row below `md` (it was truncated to "Can't co…"),
// - the shared SelectableCard gives identity picks the F93 ring + green ✓ badge,
// - the review labels its identity chips.
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Ruleset } from '@heist-mind/core';
import { getBuiltinById } from '@heist-mind/shared';
import '@/lib/i18n';
import { useCharacterCreationStore } from '../../stores/character-creation-store';
import { CharacterCreationWizard } from '../CharacterCreationWizard';
import { IdentityStep } from '../steps/IdentityStep';
import { ReviewStep } from '../steps/ReviewStep';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

const BLADES = getBuiltinById('blades-in-the-dark')?.content;
const RULESET = { id: 'bitd', name: 'Blades', content: BLADES } as unknown as Ruleset;
const store = () => useCharacterCreationStore.getState();

beforeEach(() => {
  store().reset();
});

describe('CharacterCreationWizard footer', () => {
  it('gives the blocking reason its own wrapping row below md (never truncated on phones)', () => {
    render(<CharacterCreationWizard ruleset={RULESET} />);
    const reason = screen.getByTestId('wizard-blocking-reason');
    expect(reason).toHaveTextContent(/^Can't continue yet —/);
    // Phone: first in the wrapped footer, full width, wraps. md+: inline + truncating.
    expect(reason).toHaveClass('order-first', 'basis-full', 'whitespace-normal');
    expect(reason).toHaveClass('md:truncate', 'md:flex-1');
    expect(reason).not.toHaveClass('truncate');
    expect(reason.closest('footer')).toHaveClass('flex-wrap');
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('keeps Back + the primary action together, right-aligned when they wrap (round 6 P2-4)', () => {
    render(<CharacterCreationWizard ruleset={RULESET} />);
    const nav = screen.getByTestId('wizard-nav');
    expect(nav).toHaveClass('ml-auto', 'shrink-0', 'flex');
    expect(nav).toContainElement(screen.getByRole('button', { name: 'Back' }));
    expect(nav).toContainElement(screen.getByRole('button', { name: 'Next' }));
    // Cancel stays outside the group (it's the one that may sit on a row of its own).
    expect(nav).not.toContainElement(screen.getByRole('button', { name: 'Cancel' }));
  });
});

describe('CharacterCreationWizard stepper', () => {
  it('a completed chip keeps its fill on hover (light-mode contrast, round 6 P2-9)', async () => {
    render(<CharacterCreationWizard ruleset={RULESET} />);
    act(() => store().setPlaybook('cutter'));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    const done = screen.getByText(/\(complete\)/).closest('[class*="bg-semantic-success"]');
    expect(done).toHaveClass('hover:bg-semantic-success/20');
    expect(done).not.toHaveClass('hover:bg-semantic-success/30');
  });
});

describe('SelectableCard in the identity pickers', () => {
  it('a picked vice gets the brand ring and a green ✓ Selected badge (F93, not ember)', async () => {
    store().initFromRuleset(RULESET);
    store().setPlaybook('cutter');
    const vice = BLADES?.characterCreation.steps.find(s => s.id === 'vice');
    render(<IdentityStep step={vice} />);
    const card = screen.getByRole('button', { name: /^Gambling/ });
    expect(card).toHaveAttribute('aria-pressed', 'false');
    expect(card).not.toHaveClass('ring-2');
    await userEvent.click(card);
    const picked = screen.getByRole('button', { name: /^Gambling/ });
    expect(picked).toHaveAttribute('aria-pressed', 'true');
    expect(picked).toHaveClass('ring-2', 'ring-brand-primary');
    expect(picked).toHaveTextContent('✓ Selected');
    expect(picked.querySelector('[class*="ember"]')).toBeNull();
  });
});

describe('ReviewStep identity', () => {
  it('labels each identity chip and carries its details', () => {
    store().initFromRuleset(RULESET);
    store().setIdentityField('heritage', 'Akoros');
    store().setIdentityField('background', 'Underworld');
    store().setIdentityField('vice', 'Weird');
    store().setIdentityField('viceDetail', 'Old Mags, north docks');
    render(<ReviewStep />);
    expect(screen.getByText('Heritage: Akoros')).toBeInTheDocument();
    expect(screen.getByText('Background: Underworld')).toBeInTheDocument();
    expect(screen.getByText('Vice: Weird (Old Mags, north docks)')).toBeInTheDocument();
  });
});
