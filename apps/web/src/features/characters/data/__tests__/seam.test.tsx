import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Character, DatabaseRepositories } from '@heist-mind/database';
import { getRepositories } from '@/lib/auth';
import { RepositoryError } from '@/lib/query/result';
import { characterKeys, useCharactersByPlayer } from '../queries';
import { useDetachCharacter } from '../mutations';

// Representative seam tests: one read hook (Result unwrapping into RQ data/error state) and one
// write hook (repo call + concept-wide invalidation). The pattern generalizes to every
// features/{concept}/data/ module.

const CHARACTER = { id: 'c1', name: 'Silks', createdBy: 'u1' } as unknown as Character;

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

describe('useCharactersByPlayer (read side)', () => {
  it('unwraps a successful Result into query data', async () => {
    const findByPlayer = vi.fn().mockResolvedValue({ success: true, data: [CHARACTER] });
    mockRepos({ characters: { findByPlayer } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useCharactersByPlayer('u1'), {
      wrapper: createWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([CHARACTER]);
    expect(findByPlayer).toHaveBeenCalledWith('u1');
  });

  it('routes a failed Result into query error state as a RepositoryError', async () => {
    const findByPlayer = vi
      .fn()
      .mockResolvedValue({ success: false, error: { message: 'nope', code: '42501' } });
    mockRepos({ characters: { findByPlayer } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useCharactersByPlayer('u1'), {
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

    const { result } = renderHook(() => useCharactersByPlayer(undefined), {
      wrapper: createWrapper(qc),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useDetachCharacter (write side)', () => {
  it('calls the repo and invalidates the whole character concept on success', async () => {
    const detachFromGame = vi.fn().mockResolvedValue({ success: true, data: CHARACTER });
    mockRepos({ characters: { detachFromGame } });
    const qc = testQueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useDetachCharacter(), {
      wrapper: createWrapper(qc),
    });

    await result.current.mutateAsync('c1');

    expect(detachFromGame).toHaveBeenCalledWith('c1');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: characterKeys.all });
  });

  it('throws (and does not invalidate) on a failed Result', async () => {
    const detachFromGame = vi.fn().mockResolvedValue({
      success: false,
      error: { message: 'not the owner' },
    });
    mockRepos({ characters: { detachFromGame } });
    const qc = testQueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useDetachCharacter(), {
      wrapper: createWrapper(qc),
    });

    await expect(result.current.mutateAsync('c1')).rejects.toThrow('not the owner');
    expect(invalidate).not.toHaveBeenCalled();
  });
});
