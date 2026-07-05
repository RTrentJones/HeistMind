import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Profile } from '@heist-mind/core';
import type { AuthService, DatabaseRepositories } from '@heist-mind/database';
import { getAuthService, getRepositories } from '@/lib/auth';
import { useProfileNames } from '../queries';
import { deleteAccount, fetchProfile } from '../api';

// Profiles has no repository mutations (profile creation is the DB trigger's job); the seam cases
// are the `useQueries` name fan-out, the non-hook `fetchProfile` the auth store uses, and the
// non-hook `deleteAccount` bridge to the service-role endpoint.

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

describe('deleteAccount (non-hook write side)', () => {
  const mockSession = (session: { accessToken: string } | null) => {
    vi.mocked(getAuthService).mockReturnValue({
      getCurrentSession: vi.fn().mockResolvedValue(session),
    } as unknown as AuthService);
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs to the delete endpoint with the session token as a bearer', async () => {
    mockSession({ accessToken: 'jwt-123' });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', fetchMock);

    await expect(deleteAccount()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('/api/account/delete', {
      method: 'POST',
      headers: { Authorization: 'Bearer jwt-123' },
    });
  });

  it('throws without a session and never calls the endpoint', async () => {
    mockSession(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(deleteAccount()).rejects.toThrow('Not signed in.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws on a non-OK response', async () => {
    mockSession({ accessToken: 'jwt-123' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(deleteAccount()).rejects.toThrow('Account deletion failed (500).');
  });
});
