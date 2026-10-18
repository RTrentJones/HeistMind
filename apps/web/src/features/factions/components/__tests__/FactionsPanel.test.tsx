// F95 — on Blades in the Dark (no suggested factions: setting IP) the GM had NO way to add a
// faction; the empty state pointed at a picker that never rendered. The free-text form must render
// for the GM on every ruleset, create with name/tier/status/notes through the seam, refuse a
// duplicate name, and keep the suggestion picker for rulesets that suggest. Fixture provenance:
// suggestions come from the real builtins, never an invented shape.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Faction } from '@heist-mind/core';
import { BUILTIN_RULESETS } from '@heist-mind/shared';
import { TooltipProvider } from '@heist-mind/ui';
import '@/lib/i18n';
import { FactionsPanel } from '../FactionsPanel';

let factionsState: { data: Faction[]; isLoading: boolean; error: Error | null } = {
  data: [],
  isLoading: false,
  error: null,
};
vi.mock('@/features/factions/data/queries', () => ({
  useFactionsByGame: () => factionsState,
}));
const createFaction = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };
const noop = { mutate: vi.fn(), isPending: false };
vi.mock('@/features/factions/data/mutations', () => ({
  useCreateFaction: () => createFaction,
  useDeleteFaction: () => noop,
  useSetFactionStatus: () => noop,
  useShiftFactionTier: () => noop,
}));
vi.mock('@/features/clocks/data/queries', () => ({ useClocksByGame: () => ({ data: [] }) }));
vi.mock('@/features/clocks/data/mutations', () => ({
  useCreateClock: () => noop,
  useDeleteClock: () => noop,
  useTickClock: () => noop,
}));
vi.mock('@/features/auth/stores/auth-store', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));

const bitd = BUILTIN_RULESETS.find(r => r.id === 'blades-in-the-dark')!.content;
const brackwater = BUILTIN_RULESETS.find(r => r.id === 'brackwater')!.content;

const faction = (over: Partial<Faction>): Faction => ({
  id: 'f1',
  gameId: 'g1',
  name: 'The Lampblacks',
  factionType: null,
  tier: 2,
  status: 0,
  notes: null,
  createdBy: 'u1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

const renderPanel = (props: Partial<Parameters<typeof FactionsPanel>[0]> = {}) =>
  render(
    <TooltipProvider>
      <FactionsPanel gameId='g1' isGm suggestions={bitd.factions} {...props} />
    </TooltipProvider>
  );

beforeEach(() => {
  factionsState = { data: [], isLoading: false, error: null };
  createFaction.mutate.mockReset();
  createFaction.mutateAsync.mockReset();
});

describe('FactionsPanel — GM free-text add (F95)', () => {
  it('BitD ships no suggestions, and the GM still gets the add form (no dangling "below")', () => {
    expect(bitd.factions ?? []).toHaveLength(0);
    renderPanel();
    expect(screen.getByRole('form', { name: 'Add a faction' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Suggested faction')).toBeNull();
    expect(screen.getByTestId('factions-empty')).toHaveTextContent(/with the form below/i);
    expect(screen.getByTestId('factions-empty')).not.toHaveTextContent(/city powers below/i);
  });

  it('creates with name, tier, starting status and notes, then clears the form', async () => {
    createFaction.mutateAsync.mockResolvedValue(faction({}));
    const user = userEvent.setup();
    renderPanel();
    const add = screen.getByRole('button', { name: 'Add faction' });
    expect(add).toBeDisabled(); // a name is required

    await user.type(screen.getByLabelText('Faction name'), '  The Lampblacks ');
    await user.selectOptions(screen.getByLabelText('Tier'), '2');
    await user.selectOptions(screen.getByLabelText('Starting status'), '-1');
    await user.type(screen.getByLabelText('Notes (optional)'), 'Rival gang in Crow’s Foot');
    await user.click(add);

    expect(createFaction.mutateAsync).toHaveBeenCalledWith({
      userId: 'u1',
      data: {
        gameId: 'g1',
        name: 'The Lampblacks',
        tier: 2,
        status: -1,
        notes: 'Rival gang in Crow’s Foot',
      },
    });
    await waitFor(() => expect(screen.getByLabelText('Faction name')).toHaveValue(''));
  });

  it('offers the full SRD status scale with names, defaulting to Neutral', () => {
    renderPanel();
    const status = screen.getByLabelText<HTMLSelectElement>('Starting status');
    expect(status.value).toBe('0');
    expect([...status.options].map(o => o.textContent)).toEqual([
      '+3 Allies',
      '+2 Friendly',
      '+1 Helpful',
      '0 Neutral',
      '−1 Interfering',
      '−2 Hostile',
      '−3 War',
    ]);
    const tier = screen.getByLabelText<HTMLSelectElement>('Tier');
    expect([...tier.options].map(o => o.value)).toEqual(['0', '1', '2', '3', '4', '5', '6']);
  });

  it('refuses a name the campaign already has (case-insensitive)', async () => {
    factionsState = { data: [faction({})], isLoading: false, error: null };
    const user = userEvent.setup();
    renderPanel();
    await user.type(screen.getByLabelText('Faction name'), 'the lampblacks');
    expect(screen.getByText(/already has a faction with that name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add faction' })).toBeDisabled();
  });

  it('keeps the draft and shows a friendly error when the create fails', async () => {
    createFaction.mutateAsync.mockRejectedValue(new Error('permission denied'));
    const user = userEvent.setup();
    renderPanel();
    await user.type(screen.getByLabelText('Faction name'), 'Bluecoats');
    await user.click(screen.getByRole('button', { name: 'Add faction' }));
    expect(await screen.findByText(/Failed to add faction — permission denied/)).toBeVisible();
    expect(screen.getByLabelText('Faction name')).toHaveValue('Bluecoats');
  });

  it('keeps the suggestion picker on rulesets that suggest, alongside the form', async () => {
    const user = userEvent.setup();
    renderPanel({ suggestions: brackwater.factions });
    const first = brackwater.factions![0]!;
    expect(screen.getByTestId('factions-empty')).toHaveTextContent(/suggested powers/i);
    await user.selectOptions(screen.getByLabelText('Suggested faction'), first.name);
    await user.click(screen.getByRole('button', { name: 'Add suggested faction' }));
    expect(createFaction.mutate).toHaveBeenCalledWith(
      {
        userId: 'u1',
        data: { gameId: 'g1', name: first.name, factionType: first.type, tier: first.tier ?? 0 },
      },
      expect.anything()
    );
    expect(screen.getByRole('form', { name: 'Add a faction' })).toBeInTheDocument();
  });

  it('players get no add controls and an honest empty state', () => {
    renderPanel({ isGm: false });
    expect(screen.queryByRole('form', { name: 'Add a faction' })).toBeNull();
    expect(screen.getByTestId('factions-empty')).toHaveTextContent(/your gm adds/i);
  });

  it('shows a faction’s notes on its card', () => {
    factionsState = {
      data: [faction({ notes: 'Run the coal docks' })],
      isLoading: false,
      error: null,
    };
    renderPanel({ isGm: false });
    expect(screen.getByText('Run the coal docks')).toBeInTheDocument();
  });
});
