// Round-3 #3 — the roll panel sends the ACTION with an action roll (so the engine can mark a
// desperate roll's XP in that action's attribute, RAW) and reports what was marked.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@heist-mind/ui';
import '@/lib/i18n';
import { RollPanel } from '../RollPanel';

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
  useResistanceRoll: () => ({ mutateAsync: vi.fn(), isPending: false }),
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
});
