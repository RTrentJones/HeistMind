// The Experience card: clickable XP tracks (playbook + attributes) with the ruleset's trigger
// shortcuts, and — new in the XP round — a "Take advance" CTA that appears the moment a track
// fills, so spending XP is one click from where it was earned. Real DEFAULT_RULESET content
// (fixture-provenance rule); the card is presentation — marking goes through onMarkXp.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CharacterData } from '@heist-mind/core';
import { DEFAULT_RULESET } from '@heist-mind/shared';
import '@/lib/i18n';
import { XpTracksCard } from '../XpTracksCard';

const data = (xp?: Record<string, number>) =>
  ({
    playbook: 'knife',
    attributes: {},
    skills: {},
    specialAbilities: [],
    stress: 0,
    trauma: [],
    contacts: [],
    custom: {},
    ...(xp ? { xp } : {}),
  }) as unknown as CharacterData;

describe('XpTracksCard', () => {
  it('marks a track by clicking a box (playbook and attribute)', async () => {
    const onMarkXp = vi.fn();
    render(
      <XpTracksCard
        content={DEFAULT_RULESET}
        data={data()}
        busy={false}
        canEdit
        onMarkXp={onMarkXp}
      />
    );
    await userEvent.click(
      screen.getByTestId('xp-track-playbook').querySelector('[aria-label="Mark 3 XP"]')!
    );
    expect(onMarkXp).toHaveBeenCalledWith('playbook', 3);

    await userEvent.click(
      screen.getByTestId('xp-track-force').querySelector('[aria-label="Mark 6 XP"]')!
    );
    expect(onMarkXp).toHaveBeenCalledWith('force', 6);
  });

  it('a full track shows the ready badge and the Take advance CTA wired to onAdvance', async () => {
    const onAdvance = vi.fn();
    render(
      <XpTracksCard
        content={DEFAULT_RULESET}
        data={data({ playbook: 8 })}
        busy={false}
        canEdit
        onMarkXp={() => {}}
        onAdvance={onAdvance}
      />
    );
    expect(screen.getByText('Full — ready to advance')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Take advance' }));
    expect(onAdvance).toHaveBeenCalled();
  });

  it('no CTA below full, and read-only viewers get neither clicks nor CTA', () => {
    const { rerender } = render(
      <XpTracksCard
        content={DEFAULT_RULESET}
        data={data({ playbook: 7 })}
        busy={false}
        canEdit
        onMarkXp={() => {}}
        onAdvance={() => {}}
      />
    );
    expect(screen.queryByRole('button', { name: 'Take advance' })).not.toBeInTheDocument();

    rerender(
      <XpTracksCard
        content={DEFAULT_RULESET}
        data={data({ playbook: 8 })}
        busy={false}
        canEdit={false}
        onMarkXp={() => {}}
        onAdvance={() => {}}
      />
    );
    // Full, but a non-owner sees the state without the spend affordance (F42).
    expect(screen.getByText('Full — ready to advance')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Take advance' })).not.toBeInTheDocument();
    const box = screen.getByTestId('xp-track-playbook').querySelector('button');
    expect(box).toBeDisabled();
  });

  it('trigger shortcuts add their value to the playbook track', async () => {
    const onMarkXp = vi.fn();
    render(
      <XpTracksCard
        content={DEFAULT_RULESET}
        data={data({ playbook: 2 })}
        busy={false}
        canEdit
        onMarkXp={onMarkXp}
      />
    );
    const plusButtons = screen.getAllByRole('button', { name: '+1' });
    expect(plusButtons.length).toBeGreaterThan(0);
    await userEvent.click(plusButtons[0]!);
    expect(onMarkXp).toHaveBeenCalledWith('playbook', 3);
  });
});
