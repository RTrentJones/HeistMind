import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Clock, CreateClockData } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { getRepositories } from '@/lib/auth';
import { RepositoryError } from '@/lib/query/result';
import { clockKeys, useClocksByGame } from '../queries';
import { useCreateClock, useDeleteClock, useTickClock } from '../mutations';

// Representative seam tests: one read hook (Result unwrapping into RQ data/error state) and one
// write hook (repo call + the game's clocks invalidation), per the characters seam pattern.

const CLOCK = { id: 'cl1', name: 'Alarm', segments: 4, filled: 0 } as unknown as Clock;
const CLOCK_DATA = { gameId: 'g1', name: 'Alarm', segments: 4 } as unknown as CreateClockData;

function mockRepos(repos: Record<string, unknown>) {
  vi.mocked(getRepositories).mockReturnValue(repos as unknown as DatabaseRepositories);
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function testQueryClient() {
  // retry off so the error-path test settles on the first failure.
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

beforeEach(() => {
  vi.mocked(getRepositories).mockReset();
});

describe('useClocksByGame (read side)', () => {
  it('unwraps a successful Result into query data', async () => {
    const findByGame = vi.fn().mockResolvedValue({ success: true, data: [CLOCK] });
    mockRepos({ clocks: { findByGame } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useClocksByGame('g1'), {
      wrapper: createWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([CLOCK]);
    expect(findByGame).toHaveBeenCalledWith('g1');
  });

  it('routes a failed Result into query error state as a RepositoryError', async () => {
    const findByGame = vi
      .fn()
      .mockResolvedValue({ success: false, error: { message: 'nope', code: '42501' } });
    mockRepos({ clocks: { findByGame } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useClocksByGame('g1'), {
      wrapper: createWrapper(qc),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const err = result.current.error as RepositoryError;
    expect(err).toBeInstanceOf(RepositoryError);
    expect(err.message).toBe('nope');
    expect(err.code).toBe('42501');
  });

  it('stays disabled without a gameId', () => {
    mockRepos({});
    const qc = testQueryClient();

    const { result } = renderHook(() => useClocksByGame(undefined), {
      wrapper: createWrapper(qc),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateClock (write side)', () => {
  it("calls the repo and invalidates the game's clocks on success", async () => {
    const create = vi.fn().mockResolvedValue({ success: true, data: CLOCK });
    mockRepos({ clocks: { create } });
    const qc = testQueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useCreateClock('g1'), {
      wrapper: createWrapper(qc),
    });

    await result.current.mutateAsync({ userId: 'u1', data: CLOCK_DATA });

    expect(create).toHaveBeenCalledWith('u1', CLOCK_DATA);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: clockKeys.byGame('g1') });
  });

  it('throws (and does not invalidate) on a failed Result', async () => {
    const create = vi.fn().mockResolvedValue({
      success: false,
      error: { message: 'not the GM' },
    });
    mockRepos({ clocks: { create } });
    const qc = testQueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useCreateClock('g1'), {
      wrapper: createWrapper(qc),
    });

    await expect(result.current.mutateAsync({ userId: 'u1', data: CLOCK_DATA })).rejects.toThrow(
      'not the GM'
    );
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('useTickClock (review item 3 — no swallowed double-click ticks)', () => {
  it('writes the returned row into the cache and ticks the NEXT click from that fresh fill', async () => {
    const update = vi.fn((id: string, patch: { filled: number }) =>
      Promise.resolve({ success: true, data: { ...CLOCK, id, filled: patch.filled } })
    );
    mockRepos({ clocks: { update }, rolls: { create: vi.fn() } });
    const qc = testQueryClient();
    qc.setQueryData(clockKeys.byGame('g1'), [CLOCK]);

    const { result } = renderHook(() => useTickClock('g1'), { wrapper: createWrapper(qc) });
    const vars = { clock: CLOCK, userId: 'u1', delta: 1, logLabel: 'Alarm', logNote: 'filled' };

    await result.current.mutateAsync(vars);
    expect(qc.getQueryData<Clock[]>(clockKeys.byGame('g1'))?.[0]?.filled).toBe(1);

    // The second click still carries the STALE clock (filled 0) from the earlier render…
    await result.current.mutateAsync(vars);
    // …but ticks from the cached fresh fill: 1 → 2, not 0 → 1 again.
    expect(update).toHaveBeenLastCalledWith('cl1', { filled: 2 });
    expect(qc.getQueryData<Clock[]>(clockKeys.byGame('g1'))?.[0]?.filled).toBe(2);
  });

  it('awaits the confirming invalidation before the mutation settles', async () => {
    mockRepos({
      clocks: {
        update: vi.fn().mockResolvedValue({ success: true, data: { ...CLOCK, filled: 1 } }),
      },
    });
    const qc = testQueryClient();
    let resolveInvalidate: () => void = () => undefined;
    vi.spyOn(qc, 'invalidateQueries').mockImplementation(
      () => new Promise<void>(r => (resolveInvalidate = r))
    );
    const { result } = renderHook(() => useTickClock('g1'), { wrapper: createWrapper(qc) });

    let settled = false;
    const p = result.current
      .mutateAsync({ clock: CLOCK, userId: 'u1', delta: 1, logLabel: 'a', logNote: 'b' })
      .then(() => (settled = true));
    await waitFor(() => expect(qc.invalidateQueries).toHaveBeenCalled());
    expect(settled).toBe(false);
    resolveInvalidate();
    await p;
    expect(settled).toBe(true);
  });
});

describe('useDeleteClock', () => {
  it('drops the deleted clock from the cached list', async () => {
    mockRepos({
      clocks: { delete: vi.fn().mockResolvedValue({ success: true, data: undefined }) },
    });
    const qc = testQueryClient();
    qc.setQueryData(clockKeys.byGame('g1'), [CLOCK, { ...CLOCK, id: 'cl2' }]);
    const { result } = renderHook(() => useDeleteClock('g1'), { wrapper: createWrapper(qc) });
    await result.current.mutateAsync('cl1');
    expect(qc.getQueryData<Clock[]>(clockKeys.byGame('g1'))?.map(c => c.id)).toEqual(['cl2']);
  });
});
