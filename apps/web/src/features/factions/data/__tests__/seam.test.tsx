import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Faction } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { getRepositories } from '@/lib/auth';
import { RepositoryError } from '@/lib/query/result';
import { factionKeys, useFactionsByGame } from '../queries';
import { useDeleteFaction } from '../mutations';

// Representative seam tests: one read hook (Result unwrapping into RQ data/error state) and one
// write hook (repo call + the game's factions invalidation), per the characters seam pattern.

const FACTION = { id: 'f1', name: 'The Crows', tier: 2, status: 0 } as unknown as Faction;

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

describe('useFactionsByGame (read side)', () => {
  it('unwraps a successful Result into query data', async () => {
    const findByGame = vi.fn().mockResolvedValue({ success: true, data: [FACTION] });
    mockRepos({ factions: { findByGame } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useFactionsByGame('g1'), {
      wrapper: createWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([FACTION]);
    expect(findByGame).toHaveBeenCalledWith('g1');
  });

  it('routes a failed Result into query error state as a RepositoryError', async () => {
    const findByGame = vi
      .fn()
      .mockResolvedValue({ success: false, error: { message: 'nope', code: '42501' } });
    mockRepos({ factions: { findByGame } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useFactionsByGame('g1'), {
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

    const { result } = renderHook(() => useFactionsByGame(undefined), {
      wrapper: createWrapper(qc),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useDeleteFaction (write side)', () => {
  it("calls the repo and invalidates the game's factions on success", async () => {
    const del = vi.fn().mockResolvedValue({ success: true, data: undefined });
    mockRepos({ factions: { delete: del } });
    const qc = testQueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteFaction('g1'), {
      wrapper: createWrapper(qc),
    });

    await result.current.mutateAsync('f1');

    expect(del).toHaveBeenCalledWith('f1');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: factionKeys.byGame('g1') });
  });

  it('throws (and does not invalidate) on a failed Result', async () => {
    const del = vi.fn().mockResolvedValue({
      success: false,
      error: { message: 'not the GM' },
    });
    mockRepos({ factions: { delete: del } });
    const qc = testQueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteFaction('g1'), {
      wrapper: createWrapper(qc),
    });

    await expect(result.current.mutateAsync('f1')).rejects.toThrow('not the GM');
    expect(invalidate).not.toHaveBeenCalled();
  });
});
