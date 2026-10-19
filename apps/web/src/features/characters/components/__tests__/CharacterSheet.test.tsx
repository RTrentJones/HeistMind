// F73 — the sheet's two error surfaces must stay split: a LOAD failure swaps the page for
// ErrorDisplay, but an inline-SAVE failure renders a dismissible alert and leaves the sheet
// interactive (it used to unmount the whole sheet into the load-error screen, with a full
// reload as the only recovery). The seam is mocked; the ruleset content is the real
// DEFAULT_RULESET (fixture-provenance rule — never invent a content shape).
import { render, screen, within } from '@testing-library/react';
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
// No campaign crew in these fixtures (no crew-granted stress boxes).
vi.mock('@/features/crews/data/queries', () => ({
  useCrewByGame: () => ({ data: null }),
}));
vi.mock('@/features/characters/data/mutations', () => ({
  useUpdateCharacter: () => noopMutation,
  useSetCharacterStress: () => updateCharData,
  useAddExperience: () => noopMutation,
  useIndulgeVice: () => noopMutation,
  useTakeHarm: () => noopMutation,
  useClearHarm: () => noopMutation,
  useFlashback: () => noopMutation,
  useApplyStress: () => applyStress,
  useMarkDesperateRollXp: () => noopMutation,
  useChooseTrauma: () => chooseTrauma,
}));
const applyStress = { mutate: vi.fn(), isPending: false };
const chooseTrauma = { mutate: vi.fn(), isPending: false };
vi.mock('@/features/auth/stores/auth-store', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

// Campaign-scoped panels and the editor are their own components with their own seams — out of
// scope for the error-split behavior under test.
vi.mock('@/features/rolls/components/RollPanel', () => ({
  RollPanel: ({ gameId }: { gameId: string | null }) => (
    <div data-testid='roll-panel' data-game={gameId ?? 'standalone'} />
  ),
}));
vi.mock('@/features/rolls/components/RollLog', () => ({ RollLog: () => null }));
vi.mock('../CharacterEditor', () => ({ CharacterEditor: () => null }));
vi.mock('../LoadoutCard', () => ({ LoadoutCard: () => null }));
vi.mock('../AttachToCampaign', () => ({ AttachToCampaign: () => null }));
vi.mock('../DeleteCharacterCard', () => ({
  DeleteCharacterCard: () => <div data-testid='delete-character' />,
}));
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
    // on the sheet face. The fixture sits at stress 2; a CLEAR (pip 1) is the plain validated write
    // (a mark goes through the engine's stress→trauma path, covered below).
    await userEvent.click(screen.getByRole('button', { name: 'Set stress to 1' }));

    // The failure surfaces in place (by content — the standalone banner is also an alert);
    // the sheet (name heading) is still there.
    expect(screen.getByText('RLS says no')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Silks' })).toBeInTheDocument();

    // Dismissing clears it without a reload.
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText('RLS says no')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Silks' })).toBeInTheDocument();
  });

  it('marking stress goes through the engine (RAW last box → trauma), with feed copy', async () => {
    applyStress.mutate.mockReset();
    renderSheet();
    await userEvent.click(screen.getByRole('button', { name: 'Set stress to 9' }));
    expect(applyStress.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', stress: 7, traumaLog: expect.any(Object) }),
      expect.any(Object)
    );
    expect(updateCharData.mutate).not.toHaveBeenCalled();
  });

  it('an owed trauma prompts a pick from the ruleset’s conditions', async () => {
    chooseTrauma.mutate.mockReset();
    characterQuery.data = {
      ...character,
      characterData: { ...character.characterData, stress: 0, traumaPending: 1 },
    } as CharacterWithDetails;
    renderSheet();
    expect(screen.getByTestId('trauma-pending')).toBeInTheDocument();
    const condition = DEFAULT_RULESET.traumaConditions![0]!;
    await userEvent.selectOptions(screen.getByLabelText('Trauma condition'), condition);
    await userEvent.click(screen.getByRole('button', { name: 'Mark trauma' }));
    expect(chooseTrauma.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', condition }),
      expect.any(Object)
    );
  });

  it('a full trauma track shows the must-retire banner', () => {
    characterQuery.data = {
      ...character,
      characterData: {
        ...character.characterData,
        trauma: DEFAULT_RULESET.traumaConditions!.slice(0, 4),
      },
    } as CharacterWithDetails;
    renderSheet();
    expect(screen.getByTestId('trauma-retire')).toBeInTheDocument();
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
  it('a stress clear sends ONLY the clicked value (the engine patches the live row)', async () => {
    renderSheet();
    // The fixture sits at stress 2: a clear is the engine's live-row setStress; a mark goes through
    // the stress→trauma path (covered above).
    await userEvent.click(screen.getByRole('button', { name: 'Set stress to 1' }));
    expect(updateCharData.mutate).toHaveBeenCalledWith(
      { userId: 'u1', stress: 1 },
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
    // The stress pips render but are inert for a read-only viewer.
    expect(screen.getByRole('button', { name: 'Set stress to 4' })).toBeDisabled();
  });

  // F96 — a standalone sheet rolls too ("sheet anywhere"): display-only (gameId null → no log),
  // and the campaign-only pieces (flashback → feed beat, the shared log) stay hidden.
  it('a standalone sheet offers display-only dice to its owner, without the campaign extras', () => {
    renderSheet();
    expect(screen.getByTestId('roll-panel')).toHaveAttribute('data-game', 'standalone');
    expect(screen.getByRole('heading', { name: 'Dice' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Flashback')).not.toBeInTheDocument();
  });

  // F99 (round-4 P1-2) — the standalone banner links to the attach card, and on phones that card
  // is NOT reordered to the bottom (it was `order-3`, ~4000px below "the card below").
  it('a standalone sheet links its banner to the attach card, kept high on phones', () => {
    renderSheet();
    const link = within(screen.getByTestId('standalone-banner')).getByRole('link', {
      name: /Bring it to a campaign/,
    });
    expect(link).toHaveAttribute('href', '#sheet-attach');
    const attach = document.getElementById('sheet-attach');
    expect(attach).not.toBeNull();
    expect(attach?.className).not.toMatch(/order-/);
  });

  it('an in-campaign sheet keeps move/return low on phones, with no standalone banner', () => {
    characterQuery.data = { ...character, gameId: 'g1', game: { createdBy: 'gm' } } as never;
    renderSheet();
    expect(screen.queryByTestId('standalone-banner')).not.toBeInTheDocument();
    expect(document.getElementById('sheet-attach')).toHaveClass('max-sm:order-3');
  });

  it('offers Delete character to the owner only — never the GM or a viewer (F94)', () => {
    characterQuery.data = { ...character, gameId: 'g1', game: { createdBy: 'u1' } } as never;
    const { unmount } = renderSheet();
    expect(screen.getByTestId('delete-character')).toBeInTheDocument();
    unmount();

    // The viewer is the campaign's GM but not the owner: they may edit, never delete.
    characterQuery.data = {
      ...character,
      gameId: 'g1',
      game: { createdBy: 'u1' },
      createdBy: 'someone-else',
    } as never;
    renderSheet();
    expect(screen.queryByTestId('delete-character')).not.toBeInTheDocument();
  });
});

describe('Indulge vice needs a vice (round-3 #4)', () => {
  it('is disabled with a reason until a vice is set; enabled (and labelled) once it is', () => {
    const { unmount } = renderSheet();
    const button = screen.getByRole('button', { name: /Indulge vice/ });
    expect(button).toBeDisabled();
    expect(screen.getByTestId('indulge-vice-reason')).toHaveTextContent('Set a vice');
    unmount();

    characterQuery.data = {
      ...character,
      characterData: { ...character.characterData, vice: 'Wager', viceDetail: 'Dice at the Gull' },
    } as never;
    renderSheet();
    expect(screen.getByRole('button', { name: /Indulge vice/ })).toBeEnabled();
    expect(screen.queryByTestId('indulge-vice-reason')).not.toBeInTheDocument();
    expect(screen.getByText('Vice: Wager — Dice at the Gull')).toBeInTheDocument();
  });
});
