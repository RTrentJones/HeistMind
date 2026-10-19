// useDashboardData's per-section states (review items 6/7, the F79 residue): the activity fan-out
// only starts once campaigns resolve, so its loading flag must stay true across that gap (no "No
// activity" flash), and a failed query is an ERROR, never an empty section.
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseRepositories } from '@heist-mind/database';
// The hook composes several concepts' data hooks; the test drives them all through the mocked
// repository accessor (test/setup.ts) rather than mocking each seam separately.
// eslint-disable-next-line no-restricted-imports
import { getRepositories } from '@/lib/auth';
import '@/lib/i18n';
import {
  collapseCrewRuns,
  crewEventKey,
  useDashboardData,
  type DashboardActivity,
} from '../use-dashboard-data';

const GAME = { id: 'g1', name: 'The Docks', createdBy: 'u1' };
const ROLL = { id: 'r1', gameId: 'g1', kind: 'note', createdAt: new Date().toISOString() };

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const ok = <T,>(data: T) => Promise.resolve({ success: true, data });

beforeEach(() => vi.mocked(getRepositories).mockReset());

describe('useDashboardData', () => {
  it('keeps activity LOADING until the per-campaign feeds resolve (no empty flash)', async () => {
    let releaseRolls: () => void = () => undefined;
    const rollsGate = new Promise<void>(r => (releaseRolls = r));
    vi.mocked(getRepositories).mockReturnValue({
      games: { findByCreator: () => ok([GAME]), findByPlayer: () => ok([]) },
      characters: { findByPlayer: () => ok([]) },
      rolls: { findByGame: () => rollsGate.then(() => ({ success: true, data: [ROLL] })) },
    } as unknown as DatabaseRepositories);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useDashboardData('u1'), { wrapper: wrapper(qc) });

    // Every render up to the rolls resolving: either still loading, or showing the row — never
    // "resolved with zero activity".
    await waitFor(() => expect(result.current.campaigns).toHaveLength(1));
    expect(result.current.activityStatus.loading).toBe(true);
    expect(result.current.activity).toHaveLength(0);

    releaseRolls();
    await waitFor(() => expect(result.current.activityStatus.loading).toBe(false));
    expect(result.current.activity.map(a => a.roll.id)).toEqual(['r1']);
  });

  it("resolves names for other players' characters from that campaign's roster only", async () => {
    const findByGame = vi.fn(() => ok([{ id: 'c9', name: 'Asher Vane' }]));
    vi.mocked(getRepositories).mockReturnValue({
      games: { findByCreator: () => ok([GAME]), findByPlayer: () => ok([]) },
      characters: { findByPlayer: () => ok([{ id: 'c1', name: 'Mine' }]), findByGame },
      rolls: {
        findByGame: () =>
          ok([
            { ...ROLL, id: 'r1', characterId: 'c9' },
            { ...ROLL, id: 'r2', characterId: 'c1' },
          ]),
      },
    } as unknown as DatabaseRepositories);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useDashboardData('u1'), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.activityStatus.loading).toBe(false));
    expect(result.current.characterNames).toEqual({ c9: 'Asher Vane', c1: 'Mine' });
    expect(findByGame).toHaveBeenCalledTimes(1);
    expect(findByGame).toHaveBeenCalledWith('g1');
  });

  it('surfaces a joined-campaigns failure as an error with retry, not "no campaigns"', async () => {
    const findByPlayer = vi.fn(() =>
      Promise.resolve({ success: false, error: { message: 'joined failed' } })
    );
    vi.mocked(getRepositories).mockReturnValue({
      games: { findByCreator: () => ok([]), findByPlayer },
      characters: {
        findByPlayer: () => Promise.resolve({ success: false, error: { message: 'chars down' } }),
      },
      rolls: { findByGame: () => ok([]) },
    } as unknown as DatabaseRepositories);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useDashboardData('u1'), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.campaignsStatus.error).toBe('joined failed'));
    expect(result.current.activityStatus.error).toBe('joined failed');
    await waitFor(() => expect(result.current.charactersStatus.error).toBe('chars down'));

    result.current.campaignsStatus.retry();
    await waitFor(() => expect(findByPlayer).toHaveBeenCalledTimes(2));
  });
});

describe('collapseCrewRuns (round 4 P2-N6: crew XP flooding Recent activity)', () => {
  const entry = (id: string, kind: string, gameId = 'g1'): DashboardActivity =>
    ({ roll: { id, kind, gameId }, gameName: 'The Docks' }) as unknown as DashboardActivity;

  it('folds a back-to-back crew run in one campaign into its newest row with a count', () => {
    const out = collapseCrewRuns([
      entry('c3', 'crew'),
      entry('c2', 'crew'),
      entry('c1', 'crew'),
      entry('r1', 'action'),
      entry('c0', 'crew'),
    ]);
    expect(out.map(e => [e.roll.id, e.collapsed ?? 0])).toEqual([
      ['c3', 2],
      ['r1', 0],
      ['c0', 0],
    ]);
  });

  it('folds only the SAME kind of crew event (round 5 P2-8)', () => {
    const crew = (id: string, note: string): DashboardActivity =>
      ({
        roll: { id, kind: 'crew', gameId: 'g1', note },
        gameName: 'The Docks',
      }) as unknown as DashboardActivity;
    const out = collapseCrewRuns([
      crew('x8', 'Crew XP 8/8'),
      crew('x7', 'Crew XP 7/8'),
      crew('s', 'Starting crew ability: Pack Rats'),
      crew('x6', 'Crew XP 6/8'),
    ]);
    expect(out.map(e => [e.roll.id, e.collapsed ?? 0])).toEqual([
      ['x8', 1],
      ['s', 0],
      ['x6', 0],
    ]);
    expect(crewEventKey('Heat marked — heat 3, wanted 0')).toBe(
      crewEventKey('Heat marked — heat 4, wanted 1')
    );
    expect(crewEventKey(null)).toBe('');
  });

  it('never folds across campaigns or non-crew rows', () => {
    const out = collapseCrewRuns([
      entry('a', 'crew', 'g1'),
      entry('b', 'crew', 'g2'),
      entry('x', 'xp'),
    ]);
    expect(out).toHaveLength(3);
  });
});
