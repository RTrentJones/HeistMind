import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Invitation } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { getRepositories } from '@/lib/auth';
import { RepositoryError } from '@/lib/query/result';
import { inviteKeys, useInvitesByGame } from '../queries';
import { useCreateInviteCode } from '../mutations';

// Representative seam tests: one read hook (Result unwrapping into RQ data/error state) and one
// write hook (repo call + the game's invitations invalidation), per the characters seam pattern.

const INVITE = { id: 'i1', gameId: 'g1', inviteCode: 'JOIN-1234' } as unknown as Invitation;

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

describe('useInvitesByGame (read side)', () => {
  it('unwraps a successful Result into query data', async () => {
    const findByGame = vi.fn().mockResolvedValue({ success: true, data: [INVITE] });
    mockRepos({ invitations: { findByGame } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useInvitesByGame('g1'), {
      wrapper: createWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([INVITE]);
    expect(findByGame).toHaveBeenCalledWith('g1');
  });

  it('routes a failed Result into query error state as a RepositoryError', async () => {
    const findByGame = vi
      .fn()
      .mockResolvedValue({ success: false, error: { message: 'nope', code: '42501' } });
    mockRepos({ invitations: { findByGame } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useInvitesByGame('g1'), {
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

    const { result } = renderHook(() => useInvitesByGame(undefined), {
      wrapper: createWrapper(qc),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateInviteCode (write side)', () => {
  it("applies the default maxUses and invalidates the game's invitations on success", async () => {
    const create = vi.fn().mockResolvedValue({ success: true, data: INVITE });
    mockRepos({ invitations: { create } });
    const qc = testQueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useCreateInviteCode('g1'), {
      wrapper: createWrapper(qc),
    });

    await result.current.mutateAsync({ userId: 'u1' });

    expect(create).toHaveBeenCalledWith('u1', { gameId: 'g1', maxUses: 20 });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: inviteKeys.byGame('g1') });
  });

  it('throws (and does not invalidate) on a failed Result', async () => {
    const create = vi.fn().mockResolvedValue({
      success: false,
      error: { message: 'not the GM' },
    });
    mockRepos({ invitations: { create } });
    const qc = testQueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useCreateInviteCode('g1'), {
      wrapper: createWrapper(qc),
    });

    await expect(result.current.mutateAsync({ userId: 'u1', maxUses: 5 })).rejects.toThrow(
      'not the GM'
    );
    expect(invalidate).not.toHaveBeenCalled();
  });
});
