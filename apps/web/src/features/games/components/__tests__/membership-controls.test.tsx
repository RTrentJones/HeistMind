// F94 — the hub's membership + invite controls: who sees which control, the two-click confirms,
// and that each confirmed action fires the right seam mutation (the seam itself is covered by the
// data/__tests__ suites and the e2e membership spec).
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameWithDetails } from '@heist-mind/core';
import '@/lib/i18n';
import { useAuthStore } from '@/features/auth/stores/auth-store';

const removeMutate = vi.fn();
const leaveMutate = vi.fn();
const revokeMutate = vi.fn();
const limitMutate = vi.fn();
const idle = { isPending: false, variables: undefined };

vi.mock('@/features/games/data/mutations', () => ({
  useRemovePlayer: () => ({ ...idle, mutate: removeMutate }),
  useLeaveGame: () => ({ ...idle, mutate: leaveMutate }),
  useSetPlayerLimit: () => ({ ...idle, mutate: limitMutate }),
}));
vi.mock('@/features/invitations/data/mutations', () => ({
  useCreateInviteCode: () => ({ ...idle, mutate: vi.fn() }),
  useRevokeInviteCode: () => ({ ...idle, mutate: revokeMutate }),
}));
vi.mock('@/features/invitations/data/queries', () => ({
  useInvitesByGame: () => ({
    isPending: false,
    isError: false,
    data: [
      { id: 'i1', inviteCode: 'AB12CD34', status: 'pending', maxUses: 20, usedCount: 3 },
      { id: 'i2', inviteCode: 'GONE2345', status: 'revoked', maxUses: 20, usedCount: 0 },
    ],
  }),
}));

import { MembersPanel } from '../MembersPanel';
import { InviteCodeSection, joinLinkFor } from '../InviteCodeSection';

const profile = (id: string) => ({ id, username: id, displayName: null, avatarUrl: null });
const member = (id: string, playerId: string, status: 'active' | 'removed' = 'active') => ({
  id,
  gameId: 'g1',
  playerId,
  status,
  role: 'player',
  profile: profile(playerId),
});

const GAME = {
  id: 'g1',
  createdBy: 'gm',
  creator: profile('gm'),
  players: [member('m0', 'gm'), member('m1', 'alice'), member('m2', 'bob', 'removed')],
  // The GM + alice hold seats; the default limit is the GM + 20 players (00026).
  currentPlayers: 2,
  maxPlayers: 21,
} as unknown as GameWithDetails;

beforeEach(() => {
  removeMutate.mockReset();
  leaveMutate.mockReset();
  revokeMutate.mockReset();
  limitMutate.mockReset();
});

describe('MembersPanel', () => {
  it('GM: Remove on players only (never self), two clicks, removed members listed', async () => {
    render(<MembersPanel game={GAME} userId='gm' />);
    expect(screen.queryByRole('button', { name: /remove gm/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /leave campaign/i })).toBeNull();
    expect(screen.getByTestId('removed-members')).toHaveTextContent('Removed: bob');

    await userEvent.click(screen.getByRole('button', { name: 'Remove alice from the campaign' }));
    expect(removeMutate).not.toHaveBeenCalled(); // first click only arms
    await userEvent.click(screen.getByRole('button', { name: 'Remove alice?' }));
    expect(removeMutate).toHaveBeenCalledWith(
      { playerId: 'alice', note: 'was removed from the campaign by the GM' },
      expect.any(Object)
    );
  });

  it('player: no Remove controls; Leave is a two-click confirm', async () => {
    render(<MembersPanel game={GAME} userId='alice' />);
    expect(screen.queryByRole('button', { name: /^remove/i })).toBeNull();
    expect(screen.queryByTestId('removed-members')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Leave campaign' }));
    expect(leaveMutate).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm: leave campaign' }));
    expect(leaveMutate).toHaveBeenCalledWith({ note: 'left the campaign' }, expect.any(Object));
  });
});

describe('PlayerLimitControl (round 4 P1-N1: the hidden 5-player cap)', () => {
  it('everyone sees the seat count; only the GM gets the limit control', () => {
    const { unmount } = render(<MembersPanel game={GAME} userId='alice' />);
    expect(screen.getByTestId('player-seats')).toHaveTextContent('1 of 20 players');
    expect(screen.queryByRole('spinbutton', { name: 'Player limit' })).toBeNull();
    unmount();
    render(<MembersPanel game={GAME} userId='gm' />);
    expect(screen.getByRole('spinbutton', { name: 'Player limit' })).toHaveValue(20);
  });

  it('GM saves a new limit (players, not seats); refuses out-of-range and below-players', async () => {
    const game = { ...GAME, currentPlayers: 4 } as GameWithDetails; // 3 players in
    render(<MembersPanel game={game} userId='gm' />);
    const input = screen.getByRole('spinbutton', { name: 'Player limit' });
    const save = screen.getByRole('button', { name: 'Save limit' });
    expect(save).toBeDisabled(); // unchanged
    await userEvent.clear(input);
    await userEvent.type(input, '2');
    expect(save).toBeDisabled();
    expect(screen.getByText(/3 players are already in/)).toBeInTheDocument();
    await userEvent.clear(input);
    await userEvent.type(input, '31');
    expect(save).toBeDisabled();
    expect(screen.getByText('Choose a whole number from 1 to 30.')).toBeInTheDocument();
    await userEvent.clear(input);
    await userEvent.type(input, '8');
    await userEvent.click(save);
    expect(limitMutate).toHaveBeenCalledWith({ players: 8 }, expect.any(Object));
  });

  // F102 — the limit is its own "Player limit" sub-section AFTER the list and the explainer for
  // the Remove buttons (it used to split them); its hint uses the error TEXT token.
  it('GM: list → removed → Remove explainer → Player limit, and pluralised one-seat copy', async () => {
    const one = { ...GAME, currentPlayers: 2, maxPlayers: 2 } as GameWithDetails; // 1 of 1
    render(<MembersPanel game={one} userId='gm' />);
    const order = [
      screen.getByRole('list', { name: 'Campaign members' }),
      screen.getByTestId('removed-members'),
      screen.getByText(/Removing a player hands their characters back/),
      screen.getByRole('heading', { name: 'Player limit' }),
    ];
    for (let i = 1; i < order.length; i++) {
      expect(
        order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
    expect(screen.getByTestId('player-seats')).toHaveTextContent(
      /^1 of 1 player — the campaign is full$/
    );
    const input = screen.getByRole('spinbutton', { name: 'Player limit' });
    await userEvent.clear(input);
    await userEvent.type(input, '0');
    const hint = screen.getByRole('alert');
    expect(hint).toHaveTextContent('Choose a whole number from 1 to 30.');
    expect(hint).toHaveClass('text-semantic-error-fg');
    expect(hint).not.toHaveClass('text-semantic-error');
  });

  it('a full campaign says so on the hub and in the invite card', () => {
    const full = { ...GAME, currentPlayers: 6, maxPlayers: 6 } as GameWithDetails;
    render(<MembersPanel game={full} userId='gm' />);
    expect(screen.getByTestId('player-seats')).toHaveTextContent(
      '5 of 5 players — the campaign is full'
    );
  });
});

describe('InviteCodeSection', () => {
  it('builds the invite link from the origin', () => {
    expect(joinLinkFor('https://www.heistmind.com', 'AB12CD34')).toBe(
      'https://www.heistmind.com/join/AB12CD34'
    );
  });

  it('shows uses left for live codes only, and revoke takes two clicks', async () => {
    useAuthStore.setState({ user: { id: 'gm' } as never });
    render(<InviteCodeSection gameId='g1' />);
    expect(screen.getByText('AB12CD34')).toBeInTheDocument();
    expect(screen.queryByText('GONE2345')).toBeNull();
    expect(screen.getByText('17 of 20 uses left')).toBeInTheDocument();
    // No capacity passed → no seats line (the hub always passes it).
    expect(screen.queryByTestId('invite-seats')).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy invite link' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Revoke join code AB12CD34' }));
    expect(revokeMutate).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm revoke' }));
    expect(revokeMutate).toHaveBeenCalledWith(
      { invitationId: 'i1', userId: 'gm' },
      expect.any(Object)
    );
  });
});

describe('InviteCodeSection seats (round 4: the invite copy must be truthful)', () => {
  it("says how many seats are open — and when none are, that codes won't let anyone in", () => {
    useAuthStore.setState({ user: { id: 'gm' } as never });
    const { unmount } = render(
      <InviteCodeSection gameId='g1' capacity={{ players: 5, limit: 20, open: 15, full: false }} />
    );
    // F102 — the same "N of M players" phrasing as the Players card.
    expect(screen.getByTestId('invite-seats')).toHaveTextContent('5 of 20 players — 15 open');
    expect(
      screen.getByText(/works for up to 20 joins while the campaign has an open player seat/)
    ).toBeInTheDocument();
    unmount();
    render(
      <InviteCodeSection gameId='g1' capacity={{ players: 5, limit: 5, open: 0, full: true }} />
    );
    expect(screen.getByTestId('invite-seats')).toHaveTextContent(
      /5 of 5 players — the campaign is full, so no code will let anyone in/
    );
    // The fill token failed dark-mode contrast as text; the "full" warning uses the -fg token.
    expect(screen.getByTestId('invite-seats')).toHaveClass('text-semantic-error-fg');
  });

  // F102 — pluralised on the limit: "1 of 1 player", never "1 of 1 players" / "All 1 player seats".
  it('pluralises a one-seat campaign in both cards', () => {
    useAuthStore.setState({ user: { id: 'gm' } as never });
    render(
      <InviteCodeSection gameId='g1' capacity={{ players: 1, limit: 1, open: 0, full: true }} />
    );
    expect(screen.getByTestId('invite-seats')).toHaveTextContent(
      /^1 of 1 player — the campaign is full/
    );
  });
});
