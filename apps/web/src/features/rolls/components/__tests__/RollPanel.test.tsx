// Round-3 #3 — the roll panel sends the ACTION with an action roll (so the engine can mark a
// desperate roll's XP in that action's attribute, RAW) and reports what was marked.
import { act, render, screen, waitFor } from '@testing-library/react';
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
    // F99 — the note sits inside the result's live region (announced with the result, right
    // under it), not after the static footnotes where it hid under the phone thumb bar.
    expect(screen.getByTestId('roll-result')).toContainElement(
      screen.getByTestId('desperate-xp-note')
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
        note: 'Includes −3d (penalty).',
      })
    );
  });
});

function renderWithTeam() {
  render(
    <TooltipProvider>
      <RollPanel
        gameId='g1'
        characterId='c1'
        actions={[{ name: 'Skirmish', rating: 2 }]}
        attributes={[{ id: 'prowess', name: 'Prowess', rating: 1 }]}
        teammates={[{ id: 'c9', name: 'Bo Silt' }]}
      />
    </TooltipProvider>
  );
}

const ROLLED = {
  outcome: 'partial',
  results: [4, 2],
  desperateXp: null,
  desperateXpError: null,
  stressError: null,
  assist: null,
};

describe('RollPanel — the assist option and its cost (round 6 P2-2)', () => {
  it('the option is short; the helper’s 1 stress shows on the pool line once chosen', async () => {
    renderWithTeam();
    const assist = screen.getByRole('combobox', { name: 'Assist' });
    expect(screen.getByRole('option', { name: 'Assist: Bo Silt (+1d)' })).toBeInTheDocument();
    expect(screen.getByTestId('roll-pool')).toHaveTextContent(/^Pool: 2d$/);
    await userEvent.selectOptions(assist, 'c9');
    expect(screen.getByTestId('roll-pool')).toHaveTextContent('Pool: 3d · Bo Silt takes 1 stress');
    await userEvent.selectOptions(assist, '');
    expect(screen.getByTestId('roll-pool')).toHaveTextContent(/^Pool: 2d$/);
  });
});

describe('RollPanel — one-shot moves reset after a roll (round 5 P1-2)', () => {
  it('a campaign action roll clears push, bargain, assist and ability dice; a second roll does not push', async () => {
    actionRoll.mutateAsync.mockReset().mockResolvedValue(ROLLED);
    renderWithTeam();
    await userEvent.click(screen.getByRole('checkbox', { name: /push \(\+1d, 2 stress\)/i }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Ability dice' }), '2');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Assist' }), 'c9');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Position' }), 'desperate');
    await userEvent.click(screen.getByRole('button', { name: 'Roll' }));
    expect(actionRoll.mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pushed: true,
        dice: 6,
        assist: expect.objectContaining({ characterId: 'c9' }),
      })
    );
    expect(await screen.findByTestId('roll-result')).toHaveTextContent('[4, 2]');
    expect(screen.getByRole('checkbox', { name: /push \(\+1d, 2 stress\)/i })).not.toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Ability dice' })).toHaveValue('0');
    expect(screen.getByRole('combobox', { name: 'Assist' })).toHaveValue('');
    // Action / position stay — players re-roll the same action.
    expect(screen.getByRole('combobox', { name: 'Position' })).toHaveValue('desperate');

    await userEvent.click(screen.getByRole('button', { name: 'Roll' }));
    const second = actionRoll.mutateAsync.mock.calls[1]![0];
    expect(second).toMatchObject({ pushed: false, dice: 2 });
    expect(second.assist).toBeUndefined();
    expect(second.note).toBeUndefined();
  });

  it("a devil's bargain and its note are one-shot too", async () => {
    actionRoll.mutateAsync.mockReset().mockResolvedValue(ROLLED);
    renderPanel();
    await userEvent.click(screen.getByRole('checkbox', { name: /devil's bargain/i }));
    await userEvent.type(screen.getByLabelText('The complication you accept…'), 'The watch hears');
    await userEvent.click(screen.getByRole('button', { name: 'Roll' }));
    expect(actionRoll.mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ note: "Devil's bargain: The watch hears" })
    );
    expect(await screen.findByRole('checkbox', { name: /devil's bargain/i })).not.toBeChecked();
    expect(screen.queryByLabelText('The complication you accept…')).not.toBeInTheDocument();
  });

  it('a FAILED roll keeps the moves so the player can retry', async () => {
    actionRoll.mutateAsync.mockReset().mockRejectedValue(new Error('Network down'));
    renderPanel();
    await userEvent.click(screen.getByRole('checkbox', { name: /push \(\+1d, 2 stress\)/i }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Ability dice' }), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Roll' }));
    expect(await screen.findByText('Network down')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /push \(\+1d, 2 stress\)/i })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Ability dice' })).toHaveValue('1');
  });

  it('a campaign resistance roll clears its ability dice', async () => {
    resistanceRoll.mutateAsync.mockClear();
    renderPanel();
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Roll type' }),
      'resistance'
    );
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Ability dice' }), '1');
    await userEvent.click(screen.getByRole('button', { name: /resist/i }));
    expect(resistanceRoll.mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ dice: 2 })
    );
    expect(await screen.findByRole('combobox', { name: 'Ability dice' })).toHaveValue('0');
  });
});

describe('RollPanel — a choice made while a roll is in flight survives its reset (Codex P2)', () => {
  it('switching to resistance and picking −3d mid-roll is kept; the spent push is cleared', async () => {
    let land: (v: unknown) => void = () => {};
    actionRoll.mutateAsync.mockReset().mockImplementation(
      () =>
        new Promise(resolve => {
          land = resolve;
        })
    );
    renderPanel();
    await userEvent.click(screen.getByRole('checkbox', { name: /push \(\+1d, 2 stress\)/i }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Ability dice' }), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Roll' }));
    // While the roll is pending, the player lines up the next one.
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Roll type' }),
      'resistance'
    );
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Ability dice' }), '-3');
    await act(async () => land(ROLLED));
    expect(await screen.findByTestId('roll-result')).toHaveTextContent('[4, 2]');
    expect(screen.getByRole('combobox', { name: 'Ability dice' })).toHaveValue('-3');
    expect(screen.getByRole('combobox', { name: 'Roll type' })).toHaveValue('resistance');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Roll type' }), 'action');
    expect(screen.getByRole('checkbox', { name: /push \(\+1d, 2 stress\)/i })).not.toBeChecked();
  });
});

describe('RollPanel — stress side effects of a SAVED roll (round 5 P2-5 / P2-6)', () => {
  it('a failed push-stress write keeps the roll and says to mark it (no "Roll failed")', async () => {
    actionRoll.mutateAsync.mockReset().mockResolvedValue({
      ...ROLLED,
      stressError: 'Carrying 7 load exceeds the normal limit of 5.',
    });
    renderPanel();
    await userEvent.click(screen.getByRole('checkbox', { name: /push \(\+1d, 2 stress\)/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Roll' }));
    expect(await screen.findByTestId('roll-stress-note')).toHaveTextContent(
      /roll is saved, but its 2 stress couldn’t be marked \(Carrying 7 load/
    );
    expect(screen.getByTestId('roll-result')).toHaveTextContent('[4, 2]');
    expect(screen.queryByText('Roll failed.')).not.toBeInTheDocument();
  });

  it('stress applied but its feed note failed: a mild note, never "mark it yourself"', async () => {
    actionRoll.mutateAsync.mockReset().mockResolvedValue({
      ...ROLLED,
      pushStress: { trauma: true, mustRetire: false, logError: 'feed insert refused' },
    });
    renderPanel();
    await userEvent.click(screen.getByRole('checkbox', { name: /push \(\+1d, 2 stress\)/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Roll' }));
    const note = await screen.findByTestId('roll-stress-note');
    expect(note).toHaveTextContent(/stress is marked on the sheet, but its note couldn’t be added/);
    expect(note).not.toHaveTextContent(/Mark it on the sheet yourself/);

    resistanceRoll.mutateAsync.mockResolvedValueOnce({
      roll: { outcome: 'bad', results: [3] },
      stress: 3,
      stressError: null,
      logError: 'feed insert refused',
    });
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Roll type' }),
      'resistance'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Resist' }));
    await waitFor(() =>
      expect(screen.getByTestId('roll-stress-note')).toHaveTextContent(/note couldn’t be added/)
    );
  });

  it('a failed resistance-stress write keeps the roll and says to mark it', async () => {
    resistanceRoll.mutateAsync.mockResolvedValueOnce({
      roll: { outcome: 'partial', results: [4] },
      stress: 2,
      stressError: 'Carrying 7 load exceeds the normal limit of 5.',
    });
    renderPanel();
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Roll type' }),
      'resistance'
    );
    await userEvent.click(screen.getByRole('button', { name: /resist/i }));
    expect(await screen.findByTestId('roll-stress-note')).toHaveTextContent(
      /its 2 stress couldn’t be marked/
    );
  });

  it.each([
    ['charged', /Bo Silt marked 1 stress for the assist/],
    ['near_limit', /Bo Silt is one stress box from trauma.*They mark it on their own sheet/],
    ['failed', /Bo Silt’s assist stress couldn’t be marked \(too old\)/],
  ])('tells the roller what happened to the assist stress (%s)', async (status, copy) => {
    actionRoll.mutateAsync.mockReset().mockResolvedValue({
      ...ROLLED,
      assist: { characterId: 'c9', status, ...(status === 'failed' ? { error: 'too old' } : {}) },
    });
    renderWithTeam();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Assist' }), 'c9');
    await userEvent.click(screen.getByRole('button', { name: 'Roll' }));
    expect(await screen.findByTestId('roll-stress-note')).toHaveTextContent(copy);
    expect(actionRoll.mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        note: 'Assisted by Bo Silt (+1d, 1 stress)',
        assist: { characterId: 'c9', logNote: 'Bo Silt marked 1 stress for an assist.' },
      })
    );
  });
});
