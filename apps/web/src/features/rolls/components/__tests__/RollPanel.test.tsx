// Round-3 #3 — the roll panel sends the ACTION with an action roll (so the engine can mark a
// desperate roll's XP in that action's attribute, RAW) and reports what was marked.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@heist-mind/ui';
import '@/lib/i18n';
import { RollPanel } from '../RollPanel';

const resistanceRoll = {
  mutateAsync: vi
    .fn()
    .mockResolvedValue({ roll: { outcome: 'success', results: [6, 2] }, stress: 0 }),
  isPending: false,
};
const actionRoll = {
  mutateAsync: vi.fn().mockResolvedValue({
    outcome: 'partial',
    results: [4, 2],
    desperateXp: { track: 'prowess', amount: 1, marks: 3 },
  }),
  isPending: false,
};
vi.mock('@/features/rolls/data/mutations', () => ({
  useActionRoll: () => actionRoll,
  useResistanceRoll: () => resistanceRoll,
}));
// RollPanel also wires the standalone sheet's stress write (F96); campaign rolls never call it.
vi.mock('@/features/characters/data/mutations', () => ({
  useApplyStress: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useMarkDesperateRollXp: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/features/auth/stores/auth-store', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));

describe('RollPanel — desperate-roll XP', () => {
  it('passes the action and shows the attribute XP the desperate roll marked', async () => {
    render(
      <TooltipProvider>
        <RollPanel
          gameId='g1'
          characterId='c1'
          actions={[{ name: 'Skirmish', rating: 2 }]}
          attributes={[{ id: 'prowess', name: 'Prowess', rating: 1 }]}
        />
      </TooltipProvider>
    );
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Position' }), 'desperate');
    await userEvent.click(screen.getByRole('button', { name: 'Roll' }));
    expect(actionRoll.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'Skirmish', position: 'desperate', label: 'Skirmish' })
    );
    expect(await screen.findByTestId('desperate-xp-note')).toHaveTextContent(
      'marked 1 XP in Prowess (3 on the track)'
    );
  });

  it('a full track says so (take an advance) instead of staying silent', async () => {
    actionRoll.mutateAsync.mockResolvedValueOnce({
      outcome: 'partial',
      results: [4, 2],
      desperateXp: { track: 'prowess', amount: 0, marks: 6, trackFull: true },
      desperateXpError: null,
    });
    renderPanel();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Position' }), 'desperate');
    await userEvent.click(screen.getByRole('button', { name: 'Roll' }));
    expect(await screen.findByTestId('desperate-xp-note')).toHaveTextContent(
      'Prowess XP track is already full (6/6)'
    );
  });

  it('a failed XP write keeps the saved roll (no "Roll failed") and says to mark it', async () => {
    actionRoll.mutateAsync.mockResolvedValueOnce({
      outcome: 'partial',
      results: [4, 2],
      desperateXp: null,
      desperateXpError: 'Carrying 7 load exceeds the normal limit of 5.',
    });
    renderPanel();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Position' }), 'desperate');
    await userEvent.click(screen.getByRole('button', { name: 'Roll' }));
    expect(await screen.findByTestId('desperate-xp-note')).toHaveTextContent(
      /roll is saved, but its desperate-roll XP couldn't be marked \(Carrying 7 load/
    );
    expect(screen.getByTestId('roll-result')).toHaveTextContent('[4, 2]');
    expect(screen.queryByText('Roll failed.')).not.toBeInTheDocument();
  });
});

function renderPanel() {
  render(
    <TooltipProvider>
      <RollPanel
        gameId='g1'
        characterId='c1'
        actions={[{ name: 'Skirmish', rating: 2 }]}
        attributes={[{ id: 'prowess', name: 'Prowess', rating: 1 }]}
      />
    </TooltipProvider>
  );
}

describe('RollPanel — ability dice (round 4: parity with /roll bonus: and /resist bonus:)', () => {
  it('adds the signed dice to an action pool and persists the note', async () => {
    actionRoll.mutateAsync.mockClear();
    renderPanel();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Ability dice' }), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Roll' }));
    expect(actionRoll.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        dice: 3,
        note: 'Includes +1d from an ability or upgrade.',
      })
    );
  });

  it('applies to resistance too, floored at a 0d pool', async () => {
    renderPanel();
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Roll type' }),
      'resistance'
    );
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Ability dice' }), '-3');
    await userEvent.click(screen.getByRole('button', { name: /resist/i }));
    expect(resistanceRoll.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        dice: 2,
        zeroDice: true,
        note: 'Includes −3d from an ability or upgrade.',
      })
    );
  });
});
