// Crew advancement (XP round, round-3 #1): the crew marks XP on the SAME clickable track a
// character sheet uses; a full track says to choose the advance in the picker (the spend lives
// there now — RAW: a new ability or two upgrade boxes, in one write). Presentation only —
// persistence + feed logging live in the engine use-cases the CrewSheet wires in.
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
    render(<CrewAdvanceTrack crew={crew(3)} isGm busy={false} onMarkXp={onMarkXp} />);
    await userEvent.click(screen.getByRole('button', { name: 'Mark 5 crew XP' }));
    expect(onMarkXp).toHaveBeenCalledWith(5);
    await userEvent.click(screen.getByRole('button', { name: 'Unmark — back to 2 crew XP' }));
    expect(onMarkXp).toHaveBeenCalledWith(2);
  });

  it('a full track points at the advance picker (no reset-only button any more)', () => {
    render(<CrewAdvanceTrack crew={crew(8)} isGm busy={false} onMarkXp={() => {}} />);
    expect(screen.getByText('Full — ready to advance')).toBeInTheDocument();
    expect(screen.getByText(/choose the advance below/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /take advance/i })).not.toBeInTheDocument();
  });

  it('players see the track read-only', () => {
    render(<CrewAdvanceTrack crew={crew(8)} isGm={false} busy={false} onMarkXp={() => {}} />);
    expect(screen.getByRole('button', { name: 'Mark 1 crew XP' })).toBeDisabled();
  });

  it('renders the post-advance notice', () => {
    render(
      <CrewAdvanceTrack
        crew={crew(0)}
        isGm
        busy={false}
        advanceNotice='Crew advance — new special ability: Pack Rats'
        onMarkXp={() => {}}
      />
    );
    expect(screen.getByText('Crew advance — new special ability: Pack Rats')).toBeInTheDocument();
  });
});
