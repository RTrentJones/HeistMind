import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Score } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { getRepositories } from '@/lib/auth';
import { RepositoryError } from '@/lib/query/result';
import { rollKeys } from '@/features/rolls/data/queries';
import { scoreKeys, useScoresByGame } from '../queries';
import { useStartScore } from '../mutations';

// Representative seam tests: one read hook (Result unwrapping into RQ data/error state) and one
// write hook, per the characters seam pattern. The scores writes run through the ENGINE
// use-cases; the engine is a thin repo orchestrator, so the write test drives the real
// `startScore` against mocked repositories (score start + its feed event in one operation).

const SCORE = { id: 's1', gameId: 'g1', name: 'The Vault', status: 'active' } as unknown as Score;

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

describe('useScoresByGame (read side)', () => {
  it('unwraps a successful Result into query data', async () => {
    const findByGame = vi.fn().mockResolvedValue({ success: true, data: [SCORE] });
    mockRepos({ scores: { findByGame } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useScoresByGame('g1'), {
      wrapper: createWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([SCORE]);
    expect(findByGame).toHaveBeenCalledWith('g1');
  });

  it('routes a failed Result into query error state as a RepositoryError', async () => {
    const findByGame = vi
      .fn()
      .mockResolvedValue({ success: false, error: { message: 'nope', code: '42501' } });
    mockRepos({ scores: { findByGame } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useScoresByGame('g1'), {
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

    const { result } = renderHook(() => useScoresByGame(undefined), {
      wrapper: createWrapper(qc),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useStartScore (write side, via the engine)', () => {
  it('starts the score, logs the feed event, and invalidates score list + log', async () => {
    const start = vi.fn().mockResolvedValue({ success: true, data: SCORE });
    const createRoll = vi.fn().mockResolvedValue({ success: true, data: { id: 'r1' } });
    mockRepos({ scores: { start }, rolls: { create: createRoll } });
    const qc = testQueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useStartScore('g1'), {
      wrapper: createWrapper(qc),
    });

    await result.current.mutateAsync({
      userId: 'u1',
      logLabel: 'Score started',
      logNote: 'The Vault',
    });

    // No name given → the engine forwards none (the repo names the score).
    expect(start).toHaveBeenCalledWith('u1', { gameId: 'g1' });
    expect(createRoll).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ gameId: 'g1', kind: 'score', scoreId: 's1' })
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: scoreKeys.byGame('g1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: rollKeys.gamePrefix('g1') });
  });

  it('throws (and does not invalidate) when the engine returns a failed Result', async () => {
    const start = vi.fn().mockResolvedValue({
      success: false,
      error: { message: 'a score is already active' },
    });
    mockRepos({ scores: { start } });
    const qc = testQueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useStartScore('g1'), {
      wrapper: createWrapper(qc),
    });

    await expect(
      result.current.mutateAsync({ userId: 'u1', logLabel: 'Score started', logNote: '' })
    ).rejects.toThrow('a score is already active');
    expect(invalidate).not.toHaveBeenCalled();
  });
});
