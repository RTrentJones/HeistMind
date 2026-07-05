import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Profile } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { getRepositories } from '@/lib/auth';
import { useProfileNames } from '../queries';
import { fetchProfile } from '../api';

// Profiles has no mutations (profile creation is the DB trigger's job), so both seam cases are
// read-side: the `useQueries` name fan-out and the non-hook `fetchProfile` the auth store uses.

const profile = (id: string, displayName: string, username: string) =>
  ({ id, displayName, username }) as unknown as Profile;

function mockRepos(repos: Record<string, unknown>) {
  vi.mocked(getRepositories).mockReturnValue(repos as unknown as DatabaseRepositories);
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function testQueryClient() {
  // retry off so the failed-lookup test settles on the first failure.
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

beforeEach(() => {
  vi.mocked(getRepositories).mockReset();
});

describe('useProfileNames (read side)', () => {
  it('resolves a deduped id set into an id → displayName map', async () => {
    const findById = vi
      .fn()
      .mockImplementation((id: string) =>
        Promise.resolve({ success: true, data: profile(id, `Name ${id}`, `user-${id}`) })
      );
    mockRepos({ profiles: { findById } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useProfileNames(['u1', 'u2', 'u1']), {
      wrapper: createWrapper(qc),
    });

    await waitFor(() => expect(result.current).toEqual({ u1: 'Name u1', u2: 'Name u2' }));
    // 'u1' appears twice in the input but is fetched once.
    expect(findById).toHaveBeenCalledTimes(2);
  });

  it('falls back to username and omits ids whose lookup failed', async () => {
    const findById = vi
      .fn()
      .mockImplementation((id: string) =>
        id === 'u1'
          ? Promise.resolve({ success: true, data: profile(id, '', 'silks') })
          : Promise.resolve({ success: false, error: { message: 'nope' } })
      );
    mockRepos({ profiles: { findById } });
    const qc = testQueryClient();

    const { result } = renderHook(() => useProfileNames(['u1', 'u2']), {
      wrapper: createWrapper(qc),
    });

    await waitFor(() => expect(result.current).toEqual({ u1: 'silks' }));
  });
});

describe('fetchProfile (non-hook read side)', () => {
  it('returns the profile on success', async () => {
    const findById = vi
      .fn()
      .mockResolvedValue({ success: true, data: profile('u1', 'Silks', 'silks') });
    mockRepos({ profiles: { findById } });

    await expect(fetchProfile('u1')).resolves.toEqual(profile('u1', 'Silks', 'silks'));
    expect(findById).toHaveBeenCalledWith('u1');
  });

  it('returns null on a failed Result (session hydration proceeds without a profile)', async () => {
    const findById = vi
      .fn()
      .mockResolvedValue({ success: false, error: { message: 'trigger race' } });
    mockRepos({ profiles: { findById } });

    await expect(fetchProfile('u1')).resolves.toBeNull();
  });
});
