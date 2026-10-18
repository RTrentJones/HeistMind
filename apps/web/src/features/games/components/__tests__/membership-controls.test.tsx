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
const idle = { isPending: false, variables: undefined };

vi.mock('@/features/games/data/mutations', () => ({
  useRemovePlayer: () => ({ ...idle, mutate: removeMutate }),
  useLeaveGame: () => ({ ...idle, mutate: leaveMutate }),
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
} as unknown as GameWithDetails;

beforeEach(() => {
  removeMutate.mockReset();
  leaveMutate.mockReset();
  revokeMutate.mockReset();
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
