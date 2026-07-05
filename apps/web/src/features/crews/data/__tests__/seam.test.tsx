import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Crew, UpdateCrewData } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { getRepositories } from '@/lib/auth';
import { RepositoryError } from '@/lib/query/result';
import { crewKeys, useCrewByGame } from '../queries';
import { useUpdateCrew } from '../mutations';

// Representative seam tests: one read hook (Result unwrapping into RQ data/error state) and one
// write hook (repo call + the game's crew invalidation), per the characters seam pattern.

const CREW = { id: 'cr1', name: 'The Widowers', tier: 0, rep: 3 } as unknown as Crew;
const PATCH = { rep: 4 } as unknown as UpdateCrewData;

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

describe('useCrewByGame (read side)', () => {
  it('unwraps a successful Result into query data', async () => {
    const findByGame = vi.fn().mockResolvedValue({ success: true, data: CREW });
    mockRepos({ crews: { findByGame } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useCrewByGame('g1'), {
      wrapper: createWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(CREW);
    expect(findByGame).toHaveBeenCalledWith('g1');
  });

  it('routes a failed Result into query error state as a RepositoryError', async () => {
    const findByGame = vi
      .fn()
      .mockResolvedValue({ success: false, error: { message: 'nope', code: '42501' } });
    mockRepos({ crews: { findByGame } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useCrewByGame('g1'), {
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

    const { result } = renderHook(() => useCrewByGame(undefined), {
      wrapper: createWrapper(qc),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useUpdateCrew (write side)', () => {
  it("calls the repo and invalidates the game's crew on success", async () => {
    const update = vi.fn().mockResolvedValue({ success: true, data: CREW });
    mockRepos({ crews: { update } });
    const qc = testQueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateCrew('g1'), {
      wrapper: createWrapper(qc),
    });

    await result.current.mutateAsync({ id: 'cr1', patch: PATCH });

    expect(update).toHaveBeenCalledWith('cr1', PATCH);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: crewKeys.byGame('g1') });
  });

  it('throws (and does not invalidate) on a failed Result', async () => {
    const update = vi.fn().mockResolvedValue({
      success: false,
      error: { message: 'not the GM' },
    });
    mockRepos({ crews: { update } });
    const qc = testQueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateCrew('g1'), {
      wrapper: createWrapper(qc),
    });

    await expect(result.current.mutateAsync({ id: 'cr1', patch: PATCH })).rejects.toThrow(
      'not the GM'
    );
    expect(invalidate).not.toHaveBeenCalled();
  });
});
