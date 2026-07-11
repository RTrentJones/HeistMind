// Crew advancement (XP round): the crew marks XP on the SAME clickable track a character sheet
// uses (was ± steppers), "Take advance" appears only when full, and a successful advance shows
// the pick-an-ability notice. Presentation only — persistence + feed logging live in the engine
// use-cases the CrewSheet wires in.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Crew } from '@heist-mind/core';
import '@/lib/i18n';
import { CrewAdvanceTrack } from '../CrewAdvanceTrack';

const crew = (xp: number) =>
  ({ id: 'cr1', gameId: 'g1', resources: { 'crew-xp': xp } }) as unknown as Crew;

describe('CrewAdvanceTrack', () => {
  it('marks crew XP by clicking a box', async () => {
    const onMarkXp = vi.fn();
    render(
      <CrewAdvanceTrack
        crew={crew(3)}
        isGm
        busy={false}
        onMarkXp={onMarkXp}
        onTakeAdvance={() => {}}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Mark 5 crew XP' }));
    expect(onMarkXp).toHaveBeenCalledWith(5);
    await userEvent.click(screen.getByRole('button', { name: 'Unmark — back to 2 crew XP' }));
    expect(onMarkXp).toHaveBeenCalledWith(2);
  });

  it('the advance button appears only when the track is full, wired to onTakeAdvance', async () => {
    const onTakeAdvance = vi.fn();
    const { rerender } = render(
      <CrewAdvanceTrack
        crew={crew(7)}
        isGm
        busy={false}
        onMarkXp={() => {}}
        onTakeAdvance={onTakeAdvance}
      />
    );
    expect(screen.queryByRole('button', { name: /take advance/i })).not.toBeInTheDocument();

    rerender(
      <CrewAdvanceTrack
        crew={crew(8)}
        isGm
        busy={false}
        onMarkXp={() => {}}
        onTakeAdvance={onTakeAdvance}
      />
    );
    expect(screen.getByText('Full — ready to advance')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /take advance/i }));
    expect(onTakeAdvance).toHaveBeenCalled();
  });

  it('players see the track read-only (no clicks, no advance button)', () => {
    render(
      <CrewAdvanceTrack
        crew={crew(8)}
        isGm={false}
        busy={false}
        onMarkXp={() => {}}
        onTakeAdvance={() => {}}
      />
    );
    expect(screen.queryByRole('button', { name: /take advance/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark 1 crew XP' })).toBeDisabled();
  });

  it('renders the post-advance notice', () => {
    render(
      <CrewAdvanceTrack
        crew={crew(0)}
        isGm
        busy={false}
        advanceNotice='Advance taken — pick a new crew ability below.'
        onMarkXp={() => {}}
        onTakeAdvance={() => {}}
      />
    );
    expect(screen.getByText('Advance taken — pick a new crew ability below.')).toBeInTheDocument();
  });
});
