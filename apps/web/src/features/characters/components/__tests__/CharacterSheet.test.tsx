// F73 — the sheet's two error surfaces must stay split: a LOAD failure swaps the page for
// ErrorDisplay, but an inline-SAVE failure renders a dismissible alert and leaves the sheet
// interactive (it used to unmount the whole sheet into the load-error screen, with a full
// reload as the only recovery). The seam is mocked; the ruleset content is the real
// DEFAULT_RULESET (fixture-provenance rule — never invent a content shape).
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CharacterWithDetails } from '@heist-mind/core';
import { DEFAULT_RULESET } from '@heist-mind/shared';
import { TooltipProvider } from '@heist-mind/ui';
import '@/lib/i18n';
import { CharacterSheet } from '../CharacterSheet';

const characterQuery = {
  data: null as CharacterWithDetails | null,
  isLoading: false,
  isError: false,
  error: null as Error | null,
};
vi.mock('@/features/characters/data/queries', () => ({
  useCharacterDetail: () => characterQuery,
  useCharactersByGame: () => ({ data: [] }),
}));
vi.mock('@/features/scores/data/queries', () => ({
  useScoresByGame: () => ({ data: [] }),
}));

const updateCharData = {
  mutate: vi.fn(),
  isPending: false,
};
const noopMutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };
vi.mock('@/features/characters/data/mutations', () => ({
  useUpdateCharacter: () => noopMutation,
  useSetCharacterStress: () => updateCharData,
  useAddExperience: () => noopMutation,
  useIndulgeVice: () => noopMutation,
  useTakeHarm: () => noopMutation,
  useClearHarm: () => noopMutation,
  useFlashback: () => noopMutation,
}));
vi.mock('@/features/auth/stores/auth-store', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

// Campaign-scoped panels and the editor are their own components with their own seams — out of
// scope for the error-split behavior under test.
vi.mock('@/features/rolls/components/RollPanel', () => ({
  RollPanel: () => <div data-testid='roll-panel' />,
}));
vi.mock('@/features/rolls/components/RollLog', () => ({ RollLog: () => null }));
vi.mock('../CharacterEditor', () => ({ CharacterEditor: () => null }));
vi.mock('../LoadoutCard', () => ({ LoadoutCard: () => null }));
vi.mock('../AttachToCampaign', () => ({ AttachToCampaign: () => null }));
vi.mock('../cards/GearCard', () => ({ GearCard: () => null }));
vi.mock('../cards/HarmCard', () => ({ HarmCard: () => null }));
vi.mock('../cards/XpTracksCard', () => ({ XpTracksCard: () => null }));

const playbook = DEFAULT_RULESET.playbooks[0]!;
const character = {
  id: 'c1',
  name: 'Silks',
  gameId: null,
  game: null,
  createdBy: 'u1', // the viewer owns the sheet → canEdit, so the stress tracker is interactive
  status: 'active',
  experiencePoints: 0,
  playbookType: playbook.name,
  updatedAt: new Date('2026-07-01'),
  ruleset: { content: DEFAULT_RULESET },
  characterData: {
    playbook: playbook.id,
    attributes: {},
    skills: {},
    specialAbilities: [],
    stress: 2,
    trauma: [],
    contacts: [],
    custom: {},
  },
} as unknown as CharacterWithDetails;

const renderSheet = () =>
  render(
    <TooltipProvider>
      <CharacterSheet characterId='c1' />
    </TooltipProvider>
  );

beforeEach(() => {
  characterQuery.data = character;
  characterQuery.isError = false;
  characterQuery.error = null;
  updateCharData.mutate.mockReset();
});

describe('CharacterSheet error split (F73)', () => {
  it('a failed inline save shows a dismissible alert and keeps the sheet mounted', async () => {
    updateCharData.mutate.mockImplementation(
      (_vars: unknown, opts?: { onError?: (e: Error) => void }) =>
        opts?.onError?.(new Error('RLS says no'))
    );
    renderSheet();

    // Click a stress pip (by its accessible name — F84) — the always-rendered inline mutation
    // on the sheet face. The fixture sits at stress 2, so pip 4 reads "Set stress to 4".
    await userEvent.click(screen.getByRole('button', { name: 'Set stress to 4' }));

    // The failure surfaces in place (by content — the standalone banner is also an alert);
    // the sheet (name heading) is still there.
    expect(screen.getByText('RLS says no')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Silks' })).toBeInTheDocument();

    // Dismissing clears it without a reload.
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText('RLS says no')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Silks' })).toBeInTheDocument();
  });

  it('a load failure still swaps the page for the error display', () => {
    characterQuery.data = null;
    characterQuery.isError = true;
    characterQuery.error = new Error('boom');
    renderSheet();

    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Silks' })).not.toBeInTheDocument();
  });
});

describe('CharacterSheet writes + read-only gating', () => {
  it('a stress click sends ONLY the clicked value (the engine patches the live row)', async () => {
    renderSheet();
    await userEvent.click(screen.getByRole('button', { name: 'Set stress to 4' }));
    expect(updateCharData.mutate).toHaveBeenCalledWith(
      { userId: 'u1', stress: 4 },
      expect.anything()
    );
  });

  it("the character name is the page's h1", () => {
    renderSheet();
    expect(screen.getByRole('heading', { level: 1, name: 'Silks' })).toBeInTheDocument();
  });

  it('offers the Roll panel to the owner but not to a read-only viewer (pixel #3)', () => {
    characterQuery.data = { ...character, gameId: 'g1', game: { createdBy: 'gm' } } as never;
    const { unmount } = renderSheet();
    expect(screen.getByTestId('roll-panel')).toBeInTheDocument();
    unmount();

    characterQuery.data = {
      ...character,
      gameId: 'g1',
      game: { createdBy: 'gm' },
      createdBy: 'someone-else',
    } as never;
    renderSheet();
    expect(screen.queryByTestId('roll-panel')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Set stress to 4' })).not.toBeInTheDocument();
  });
});
