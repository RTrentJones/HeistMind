// The Experience card: clickable XP tracks (playbook + attributes) with the ruleset's trigger
// shortcuts, and — new in the XP round — a "Take advance" CTA that appears the moment a track
// fills, so spending XP is one click from where it was earned. Real DEFAULT_RULESET content
// (fixture-provenance rule); the card is presentation — marking goes through onMarkXp.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CharacterData } from '@heist-mind/core';
import { DEFAULT_RULESET, getBuiltinById } from '@heist-mind/shared';
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

  it('session triggers mark 1 or 2 XP on the chosen track (RAW: any track)', async () => {
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
    const plusOne = screen.getAllByRole('button', { name: /^Mark 1 XP on Playbook:/ });
    expect(plusOne.length).toBeGreaterThan(0);
    await userEvent.click(plusOne[0]!);
    expect(onMarkXp).toHaveBeenCalledWith('playbook', 3);
    await userEvent.selectOptions(screen.getByLabelText('Mark end-of-session XP on'), 'force');
    await userEvent.click(screen.getAllByRole('button', { name: /^Mark 2 XP on Force:/ })[0]!);
    expect(onMarkXp).toHaveBeenCalledWith('force', 2);
  });

  it('BitD: the playbook trigger leads the session list; the desperate trigger is auto, not a button', () => {
    const bitd = getBuiltinById('blades-in-the-dark')?.content ?? DEFAULT_RULESET;
    render(
      <XpTracksCard
        content={bitd}
        data={{ ...data(), playbook: 'cutter' }}
        busy={false}
        canEdit
        onMarkXp={() => {}}
      />
    );
    const session = screen.getByTestId('xp-session-triggers');
    expect(session).toHaveTextContent('You addressed a challenge with violence or coercion.');
    expect(session).not.toHaveTextContent('desperate');
    expect(screen.getByTestId('xp-desperate-trigger')).toHaveTextContent(
      /attribute for the action you rolled.*automatically/
    );
  });
});
