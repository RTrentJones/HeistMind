import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CreateGameData, Game } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { getRepositories } from '@/lib/auth';
import { RepositoryError } from '@/lib/query/result';
import { gameKeys, useGamesByCreator } from '../queries';
import { useCreateGame } from '../mutations';

// Representative seam tests: one read hook (Result unwrapping into RQ data/error state) and one
// write hook (repo call + concept-wide invalidation), per the characters seam pattern.

const GAME = { id: 'g1', name: 'Doskvol Nights', createdBy: 'u1' } as unknown as Game;
const GAME_DATA = { name: 'Doskvol Nights', rulesetId: 'rs1' } as unknown as CreateGameData;

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

describe('useGamesByCreator (read side)', () => {
  it('unwraps a successful Result into query data', async () => {
    const findByCreator = vi.fn().mockResolvedValue({ success: true, data: [GAME] });
    mockRepos({ games: { findByCreator } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useGamesByCreator('u1'), {
      wrapper: createWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([GAME]);
    expect(findByCreator).toHaveBeenCalledWith('u1');
  });

  it('routes a failed Result into query error state as a RepositoryError', async () => {
    const findByCreator = vi
      .fn()
      .mockResolvedValue({ success: false, error: { message: 'nope', code: '42501' } });
    mockRepos({ games: { findByCreator } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useGamesByCreator('u1'), {
      wrapper: createWrapper(qc),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const err = result.current.error as RepositoryError;
    expect(err).toBeInstanceOf(RepositoryError);
    expect(err.message).toBe('nope');
    expect(err.code).toBe('42501');
  });

  it('stays disabled without a userId', () => {
    mockRepos({});
    const qc = testQueryClient();

    const { result } = renderHook(() => useGamesByCreator(undefined), {
      wrapper: createWrapper(qc),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateGame (write side)', () => {
  it('calls the repo and invalidates the whole games concept on success', async () => {
    const create = vi.fn().mockResolvedValue({ success: true, data: GAME });
    mockRepos({ games: { create } });
    const qc = testQueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useCreateGame(), {
      wrapper: createWrapper(qc),
    });

    await result.current.mutateAsync({ userId: 'u1', data: GAME_DATA });

    expect(create).toHaveBeenCalledWith('u1', GAME_DATA);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: gameKeys.all });
  });

  it('throws (and does not invalidate) on a failed Result — the 23505 code survives', async () => {
    const create = vi.fn().mockResolvedValue({
      success: false,
      error: { message: 'duplicate game name', code: '23505' },
    });
    mockRepos({ games: { create } });
    const qc = testQueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useCreateGame(), {
      wrapper: createWrapper(qc),
    });

    const attempt = result.current.mutateAsync({ userId: 'u1', data: GAME_DATA });
    await expect(attempt).rejects.toThrow('duplicate game name');
    await expect(attempt).rejects.toMatchObject({ code: '23505' });
    expect(invalidate).not.toHaveBeenCalled();
  });
});
