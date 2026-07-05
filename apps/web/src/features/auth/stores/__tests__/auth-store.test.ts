// Auth store transitions driven through the mocked auth service (test/setup.ts mocks @/lib/auth,
// so getAuthService is a vi.fn() configured per test; profile reads ride the profiles seam's
// fetchProfile, mocked below). The OAuth listener is no longer installed at import time —
// initAuthListener() is exercised directly, but its module-level `listenerInstalled` guard means
// only ONE test can install it per module instance, so all the listener assertions live in a
// single test.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '@heist-mind/core';
import { getAuthService } from '@/lib/auth';
import { fetchProfile } from '@/features/profiles/data/api';
import { initAuthListener, useAuthStore, type AuthUser } from '../auth-store';

vi.mock('@/features/profiles/data/api', () => ({
  fetchProfile: vi.fn(),
}));

const PROFILE = { id: 'u1', displayName: 'Silks', username: 'silks' } as unknown as Profile;
const USER = { id: 'u1', email: 'silks@example.com' } as unknown as AuthUser;

type AuthService = ReturnType<typeof getAuthService>;

function mockAuthService(overrides: Record<string, unknown> = {}) {
  const service = {
    onAuthStateChange: vi.fn(),
    getCurrentSession: vi.fn().mockResolvedValue(null),
    signInWithOAuth: vi.fn().mockResolvedValue({ data: null, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
  vi.mocked(getAuthService).mockReturnValue(service as unknown as AuthService);
  return service;
}

const state = () => useAuthStore.getState();

beforeEach(() => {
  vi.mocked(getAuthService).mockReset();
  vi.mocked(fetchProfile).mockReset();
  state().reset();
});

describe('signInWithProvider', () => {
  it('hands off to the OAuth service and clears the loading flag', async () => {
    const service = mockAuthService();

    await state().signInWithProvider('discord');

    expect(service.signInWithOAuth).toHaveBeenCalledWith({ provider: 'discord' });
    expect(state().isLoading).toBe(false);
    expect(state().error).toBeNull();
    // The user/profile arrive via the session check after the redirect, not here.
    expect(state().isAuthenticated).toBe(false);
  });

  it('surfaces a service error in store state and rethrows', async () => {
    mockAuthService({
      signInWithOAuth: vi.fn().mockResolvedValue({ data: null, error: { message: 'denied' } }),
    });

    await expect(state().signInWithProvider('discord')).rejects.toThrow('denied');
    expect(state().error).toBe('denied');
    expect(state().isLoading).toBe(false);
  });
});

describe('signOut', () => {
  it('clears the signed-in state (a fresh checkSession rebuilds it)', async () => {
    mockAuthService();
    state().setUser(USER);
    expect(state().isAuthenticated).toBe(true);

    await state().signOut();

    expect(state().user).toBeNull();
    expect(state().profile).toBeNull();
    expect(state().isAuthenticated).toBe(false);
    expect(state().sessionChecked).toBe(false);
  });

  it('keeps the session and surfaces the error when the service fails', async () => {
    mockAuthService({
      signOut: vi.fn().mockResolvedValue({ error: { message: 'network down' } }),
    });
    state().setUser(USER);

    await expect(state().signOut()).rejects.toThrow('network down');
    expect(state().error).toBe('network down');
    expect(state().user).toEqual(USER);
    expect(state().isAuthenticated).toBe(true);
  });
});

describe('checkSession', () => {
  it('hydrates user + profile from an existing session', async () => {
    mockAuthService({ getCurrentSession: vi.fn().mockResolvedValue({ user: USER }) });
    vi.mocked(fetchProfile).mockResolvedValue(PROFILE);

    await state().checkSession();

    expect(fetchProfile).toHaveBeenCalledWith('u1');
    expect(state().user).toMatchObject({ id: 'u1', profile: PROFILE });
    expect(state().profile).toEqual(PROFILE);
    expect(state().isAuthenticated).toBe(true);
    expect(state().sessionChecked).toBe(true);
    expect(state().isLoading).toBe(false);
  });

  it('settles unauthenticated (but checked) when there is no session', async () => {
    mockAuthService();

    await state().checkSession();

    expect(state().user).toBeNull();
    expect(state().isAuthenticated).toBe(false);
    expect(state().sessionChecked).toBe(true);
  });

  it('short-circuits once the session has been checked', async () => {
    const service = mockAuthService();
    useAuthStore.setState({ sessionChecked: true });

    await state().checkSession();

    expect(service.getCurrentSession).not.toHaveBeenCalled();
  });

  it('records the failure and still marks the session checked', async () => {
    mockAuthService({
      getCurrentSession: vi.fn().mockRejectedValue(new Error('supabase down')),
    });

    await state().checkSession();

    expect(state().error).toBe('supabase down');
    expect(state().sessionChecked).toBe(true);
    expect(state().isLoading).toBe(false);
  });
});

describe('setters', () => {
  it('setProfile embeds the profile into the current user', () => {
    state().setUser(USER);

    state().setProfile(PROFILE);

    expect(state().profile).toEqual(PROFILE);
    expect(state().user).toMatchObject({ id: 'u1', profile: PROFILE });
  });

  it('reset returns to the signed-out initial state', () => {
    state().setUser(USER);
    state().setProfile(PROFILE);
    state().setError('boom');

    state().reset();

    expect(state()).toMatchObject({
      user: null,
      profile: null,
      isAuthenticated: false,
      sessionChecked: false,
      isLoading: false,
      error: null,
    });
  });
});

describe('initAuthListener (single-install)', () => {
  it('installs once and routes OAuth events into the store', async () => {
    vi.useFakeTimers();
    try {
      const service = mockAuthService();
      vi.mocked(fetchProfile).mockResolvedValue(PROFILE);

      initAuthListener();
      initAuthListener(); // the guard makes the second call a no-op
      expect(service.onAuthStateChange).toHaveBeenCalledTimes(1);

      const listener = service.onAuthStateChange.mock.calls[0]?.[0] as (event: {
        session: unknown;
        user: unknown;
      }) => Promise<void>;

      await listener({ session: { user: USER }, user: USER });
      expect(state().user).toMatchObject({ id: 'u1', profile: PROFILE });
      expect(state().isAuthenticated).toBe(true);
      expect(state().sessionChecked).toBe(true);

      await listener({ session: null, user: null });
      expect(state().user).toBeNull();
      expect(state().isAuthenticated).toBe(false);

      // The delayed manual check no-ops: the listener already marked the session checked.
      vi.runAllTimers();
      expect(service.getCurrentSession).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
