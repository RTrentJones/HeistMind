// F95 — a standalone character (no campaign) rolls from its own sheet: RollPanel with
// `gameId: null` is display-only — the outcome is classified locally, NOTHING goes to a campaign
// log, and only the stress the rules charge (push +2, resistance 6 − highest, a crit clearing 1)
// lands on the sheet through the engine applyStress path.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@heist-mind/ui';
import '@/lib/i18n';
import { RollPanel } from '../RollPanel';

const actionRoll = { mutateAsync: vi.fn(), isPending: false };
const resistanceRoll = { mutateAsync: vi.fn(), isPending: false };
const applyStress = { mutateAsync: vi.fn().mockResolvedValue(null), isPending: false };
vi.mock('@/features/rolls/data/mutations', () => ({
  useActionRoll: () => actionRoll,
  useResistanceRoll: () => resistanceRoll,
}));
vi.mock('@/features/characters/data/mutations', () => ({
  useApplyStress: () => applyStress,
}));
vi.mock('@/features/auth/stores/auth-store', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));

/** Make every realized die land on `face` (1–6). */
const randomSpy = vi.spyOn(Math, 'random');
const fixDice = (face: number) => randomSpy.mockReturnValue((face - 1) / 6 + 0.01);

const renderLocal = () =>
  render(
    <TooltipProvider>
      <RollPanel
        gameId={null}
        characterId='c1'
        actions={[
          { name: 'Prowl', rating: 2 },
          { name: 'Hunt', rating: 0 },
        ]}
        attributes={[{ name: 'Prowess', rating: 1 }]}
      />
    </TooltipProvider>
  );

beforeEach(() => {
  actionRoll.mutateAsync.mockReset();
  resistanceRoll.mutateAsync.mockReset();
  applyStress.mutateAsync.mockClear();
});
// Only Math.random is restored — restoreAllMocks would also undo the setup file's global mocks.
afterAll(() => randomSpy.mockRestore());

describe('RollPanel — standalone (display-only) rolls', () => {
  it('classifies an action roll locally and persists nothing', async () => {
    fixDice(6);
    const user = userEvent.setup();
    renderLocal();
    expect(screen.getByTestId('roll-local-note')).toHaveTextContent(/aren't saved anywhere/i);
    await user.click(screen.getByRole('button', { name: 'Roll' }));
    // Two sixes on Prowl 2 = critical.
    expect(await screen.findByTestId('roll-result')).toHaveTextContent(/critical/i);
    expect(screen.getByTestId('roll-result')).toHaveTextContent('[6, 6]');
    expect(actionRoll.mutateAsync).not.toHaveBeenCalled();
    expect(applyStress.mutateAsync).not.toHaveBeenCalled();
  });

  it('pushing charges 2 stress to the sheet (no log write)', async () => {
    fixDice(4);
    const user = userEvent.setup();
    renderLocal();
    await user.click(screen.getByLabelText(/push \(\+1d, 2 stress\)/i));
    await user.click(screen.getByRole('button', { name: 'Roll' }));
    expect(await screen.findByTestId('roll-result')).toHaveTextContent('[4, 4, 4]');
    expect(applyStress.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', stress: 2 })
    );
    expect(actionRoll.mutateAsync).not.toHaveBeenCalled();
  });

  it('a resistance roll marks 6 − highest on the sheet', async () => {
    fixDice(4);
    const user = userEvent.setup();
    renderLocal();
    await user.selectOptions(screen.getByLabelText('Roll type'), 'resistance');
    await user.click(screen.getByRole('button', { name: 'Resist' }));
    expect(await screen.findByTestId('roll-result')).toHaveTextContent(/2 stress/i);
    expect(applyStress.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', stress: 2 })
    );
    expect(resistanceRoll.mutateAsync).not.toHaveBeenCalled();
  });

  it('keeps a short on-screen history of this session’s rolls', async () => {
    const user = userEvent.setup();
    renderLocal();
    fixDice(2);
    await user.click(screen.getByRole('button', { name: 'Roll' }));
    fixDice(5);
    await user.click(screen.getByRole('button', { name: 'Roll' }));
    const items = (await screen.findByTestId('roll-history')).querySelectorAll('li');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(/Prowl · Partial.*\[5, 5\]/);
    expect(items[1]).toHaveTextContent(/Prowl · Bad.*\[2, 2\]/);
  });
});
