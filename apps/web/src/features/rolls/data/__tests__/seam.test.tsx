import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CreateRollData, Roll } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { getRepositories } from '@/lib/auth';
import { RepositoryError } from '@/lib/query/result';
import { DEFAULT_ROLL_FEED_LIMIT, rollKeys, useRollsByGame } from '../queries';
import { useCreateRoll } from '../mutations';

// Representative seam tests: one read hook (Result unwrapping into RQ data/error state) and one
// write hook (repo call + the game's log invalidation), per the characters seam pattern.

const ROLL = { id: 'r1', gameId: 'g1', kind: 'action', dice: 2 } as unknown as Roll;
const ROLL_DATA = { gameId: 'g1', kind: 'note', label: 'Retired' } as unknown as CreateRollData;

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

describe('useRollsByGame (read side)', () => {
  it('unwraps a successful Result into query data (default feed limit)', async () => {
    const findByGame = vi.fn().mockResolvedValue({ success: true, data: [ROLL] });
    mockRepos({ rolls: { findByGame } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useRollsByGame('g1'), {
      wrapper: createWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([ROLL]);
    expect(findByGame).toHaveBeenCalledWith('g1', DEFAULT_ROLL_FEED_LIMIT);
  });

  it('routes a failed Result into query error state as a RepositoryError', async () => {
    const findByGame = vi
      .fn()
      .mockResolvedValue({ success: false, error: { message: 'nope', code: '42501' } });
    mockRepos({ rolls: { findByGame } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useRollsByGame('g1'), {
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

    const { result } = renderHook(() => useRollsByGame(undefined), {
      wrapper: createWrapper(qc),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateRoll (write side)', () => {
  it("calls the repo and invalidates every limit-variant of the game's log on success", async () => {
    const create = vi.fn().mockResolvedValue({ success: true, data: ROLL });
    mockRepos({ rolls: { create } });
    const qc = testQueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useCreateRoll('g1'), {
      wrapper: createWrapper(qc),
    });

    await result.current.mutateAsync({ userId: 'u1', data: ROLL_DATA });

    expect(create).toHaveBeenCalledWith('u1', ROLL_DATA);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: rollKeys.gamePrefix('g1') });
  });

  it('throws (and does not invalidate) on a failed Result', async () => {
    const create = vi.fn().mockResolvedValue({
      success: false,
      error: { message: 'not a member' },
    });
    mockRepos({ rolls: { create } });
    const qc = testQueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useCreateRoll('g1'), {
      wrapper: createWrapper(qc),
    });

    await expect(result.current.mutateAsync({ userId: 'u1', data: ROLL_DATA })).rejects.toThrow(
      'not a member'
    );
    expect(invalidate).not.toHaveBeenCalled();
  });
});
