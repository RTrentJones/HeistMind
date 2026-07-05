import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Clock, CreateClockData } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { getRepositories } from '@/lib/auth';
import { RepositoryError } from '@/lib/query/result';
import { clockKeys, useClocksByGame } from '../queries';
import { useCreateClock } from '../mutations';

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
