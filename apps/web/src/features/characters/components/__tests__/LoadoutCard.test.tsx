// LoadoutCard's capacity math + rules-driven affordances: the gauge, the over-capacity refusal
// (the system won't OFFER an illegal save), dirty-gating, the stale-score warning, and the
// no-silent-failure error surface. The seam is mocked; the load engine is the real core.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CharacterWithDetails, Score } from '@heist-mind/core';
import '@/lib/i18n';
import { LoadoutCard } from '../LoadoutCard';

const saveMutation = {
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null as { message: string } | null,
};
vi.mock('@/features/characters/data/mutations', () => ({
  useSaveLoadout: () => saveMutation,
}));
vi.mock('@/features/auth/stores/auth-store', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

const character = (loadout?: { level: 'light' | 'normal' | 'heavy'; items: string[]; scoreId?: string }) =>
  ({
    id: 'c1',
    name: 'Silks',
    gameId: 'g1',
    updatedAt: new Date('2026-07-01'),
    ruleset: {
      content: {
        metadata: { name: 'T', version: '1', author: '', description: '', system: 'fitd' },
        playbooks: [{ id: 'cutter', name: 'Cutter', equipment: ['blade'] }],
        attributes: [],
        characterCreation: { steps: [] },
        equipment: {
          loadCapacity: { light: 3, normal: 5, heavy: 6 },
          items: [
            { id: 'blade', name: 'A Blade', description: '', load: 2 },
            { id: 'armor', name: 'Heavy Armor', description: '', load: 3 },
            { id: 'rope', name: 'Climbing Gear', description: '', load: 2 },
          ],
        },
      },
    },
    characterData: {
      playbook: 'cutter',
      attributes: {},
      skills: {},
      specialAbilities: [],
      stress: 0,
      trauma: [],
      contacts: [],
      custom: {},
      ...(loadout ? { loadout } : {}),
    },
  }) as unknown as CharacterWithDetails;

beforeEach(() => {
  saveMutation.mutate.mockClear();
  saveMutation.isError = false;
  saveMutation.error = null;
});

describe('LoadoutCard', () => {
  it('shows the load gauge for the saved loadout', () => {
    render(
      <LoadoutCard character={character({ level: 'normal', items: ['blade', 'armor'] })} activeScore={null} canEdit />
    );
    expect(screen.getByText('Load 5/5')).toBeInTheDocument();
  });

  it('over capacity: warns and REFUSES to offer the save (rules-driven validity)', async () => {
    render(
      <LoadoutCard character={character({ level: 'light', items: ['blade'] })} activeScore={null} canEdit />
    );
    // 2/3 so far; adding Heavy Armor (3) goes to 5/3.
    await userEvent.click(screen.getByRole('checkbox', { name: /Heavy Armor/ }));
    expect(screen.getByText('Load 5/3')).toBeInTheDocument();
    expect(screen.getByText(/Over capacity/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save loadout' })).toBeDisabled();
  });

  it('save stays disabled while clean, enables when dirty, and sends the tagged loadout', async () => {
    const score = { id: 's1', status: 'active' } as unknown as Score;
    render(
      <LoadoutCard character={character({ level: 'normal', items: ['blade'], scoreId: 's1' })} activeScore={score} canEdit />
    );
    const save = screen.getByRole('button', { name: 'Save loadout' });
    expect(save).toBeDisabled(); // draft == saved

    await userEvent.click(screen.getByRole('checkbox', { name: /Climbing Gear/ }));
    expect(save).toBeEnabled();
    await userEvent.click(save);
    expect(saveMutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        loadout: expect.objectContaining({ items: ['blade', 'rope'], scoreId: 's1' }),
      }),
      expect.anything()
    );
  });

  it('flags a loadout from a previous score as stale', () => {
    const score = { id: 's2', status: 'active' } as unknown as Score;
    render(
      <LoadoutCard character={character({ level: 'normal', items: ['blade'], scoreId: 's1' })} activeScore={score} canEdit />
    );
    expect(screen.getByText(/previous score/)).toBeInTheDocument();
  });

  it('surfaces a failed save instead of swallowing it', () => {
    saveMutation.isError = true;
    saveMutation.error = { message: 'RLS says no' };
    render(
      <LoadoutCard character={character({ level: 'normal', items: ['blade'] })} activeScore={null} canEdit />
    );
    expect(screen.getByText(/Couldn't save the loadout/)).toBeInTheDocument();
    expect(screen.getByText(/RLS says no/)).toBeInTheDocument();
  });

  it('read-only for viewers: no toggles enabled, no save button', () => {
    render(
      <LoadoutCard
        character={character({ level: 'normal', items: ['blade'] })}
        activeScore={null}
        canEdit={false}
      />
    );
    expect(screen.queryByRole('button', { name: 'Save loadout' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /A Blade/ })).toBeDisabled();
  });
});
