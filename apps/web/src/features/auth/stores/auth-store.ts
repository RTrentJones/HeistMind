import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { type Profile } from '@heist-mind/core';
import { type User } from '@heist-mind/database';
import { type LoadingState } from '@/shared/types';
import { captureError } from '@heist-mind/telemetry';
import { getAuthService } from '@/lib/auth';
import { callbackUrl, rememberNextPath, safeNextPath } from '@/lib/auth/next-path';
import { getQueryClient } from '@/lib/query/client';
import { readAuthHint } from '@/lib/auth-hint';
// Profile reads go through the profiles data seam (its non-hook surface — this store's actions run
// outside React); repositories are never touched here directly.
import * as profilesApi from '@/features/profiles/data/api';

export interface AuthUser extends User {
  profile?: Profile;
}

interface AuthState extends LoadingState {
  // User state
  user: AuthUser | null;
  profile: Profile | null;
  isAuthenticated: boolean;

  // Session state
  sessionChecked: boolean;
  /**
   * True once the persisted slice has been read from localStorage (client-only, after mount — see
   * `rehydrateAuthStore`). Before that, every render (server HTML and the first client render)
   * sees the signed-out defaults, so auth-dependent UI should hold a neutral placeholder rather
   * than flash a sign-in prompt to a returning user.
   */
  hasHydrated: boolean;
  /**
   * F98 — this browser LOOKS signed in (persisted hint or a Supabase session key; see
   * lib/auth-hint.ts), read at hydration. Not persisted, never proof: it only makes auth-dependent
   * UI hold a neutral placeholder until `sessionChecked`, instead of flashing signed-out UI.
   */
  sessionHint: boolean;

  // Auth actions (Discord OAuth is the only sign-in method — see BRD; the profile row is created
  // by the DB trigger on first sign-in, so there is no client-side signup/profile-create path).
  signOut: () => Promise<void>;
  signInWithProvider: (
    provider: 'google' | 'discord',
    options?: { next?: string | null }
  ) => Promise<void>;

  // Session management
  checkSession: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: Profile | null) => void;

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        profile: null,
        isAuthenticated: false,
        sessionChecked: false,
        hasHydrated: false,
        sessionHint: false,
        isLoading: false,
        error: null,
        lastUpdated: undefined,

        // Auth actions
        signOut: async () => {
          set({ isLoading: true, error: null });
          try {
            const authService = getAuthService();
            const result = await authService.signOut();

            if (result.error) {
              throw new Error(result.error.message || 'Sign out failed');
            }

            set({
              user: null,
              profile: null,
              isAuthenticated: false,
              isLoading: false,
              sessionChecked: false,
              sessionHint: false,
              lastUpdated: new Date(),
            });
            // Drop every cached query so the next account on this browser never sees the previous
            // user's campaigns/characters/rolls served from cache.
            getQueryClient().clear();
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Sign out failed',
              isLoading: false,
            });
            throw error;
          }
        },

        signInWithProvider: async (
          provider: 'google' | 'discord',
          options?: { next?: string | null }
        ) => {
          set({ isLoading: true, error: null });
          try {
            const authService = getAuthService();
            // F94 — carry return-to intent (e.g. /join/<code>) through the OAuth round trip:
            // validated `next` on the callback URL + a sessionStorage fallback.
            rememberNextPath(options?.next);
            const result = await authService.signInWithOAuth({
              provider,
              ...(typeof window !== 'undefined' && safeNextPath(options?.next)
                ? {
                    options: {
                      redirectTo: callbackUrl(window.location.origin, provider, options?.next),
                    },
                  }
                : {}),
            });

            if (result.error) {
              throw new Error(result.error?.message || 'Provider sign in failed');
            }

            // Note: The actual user/profile will be set via session check after redirect
            set({ isLoading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Provider sign in failed',
              isLoading: false,
            });
            throw error;
          }
        },

        // Session management
        checkSession: async () => {
          if (get().sessionChecked) return;

          set({ isLoading: true, error: null });
          try {
            const authService = getAuthService();

            const session = await authService.getCurrentSession();

            if (session?.user) {
              const profile = await profilesApi.fetchProfile(session.user.id);

              set({
                user: { ...session.user, profile: profile || undefined },
                profile,
                isAuthenticated: true,
                sessionChecked: true,
                isLoading: false,
                lastUpdated: new Date(),
              });
            } else {
              set({
                user: null,
                profile: null,
                isAuthenticated: false,
                sessionChecked: true,
                isLoading: false,
              });
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Session check failed',
              sessionChecked: true,
              isLoading: false,
            });
          }
        },

        setUser: (user: AuthUser | null) => {
          set({
            user,
            isAuthenticated: !!user,
            lastUpdated: new Date(),
          });
        },

        setProfile: (profile: Profile | null) => {
          set((state: AuthState) => ({
            profile,
            user: state.user ? { ...state.user, profile: profile || undefined } : null,
            lastUpdated: new Date(),
          }));
        },

        // State management
        setLoading: (isLoading: boolean) => set({ isLoading }),
        setError: (error: string | null) => set({ error }),
        reset: () =>
          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            sessionChecked: false,
            sessionHint: false,
            isLoading: false,
            error: null,
            lastUpdated: undefined,
          }),
      }),
      {
        name: 'auth-store',
        // Bump when the persisted shape changes; rehydration drops older versions (a fresh
        // checkSession rebuilds the session state).
        version: 1,
        // Don't hydrate at store creation; `rehydrateAuthStore()` runs it from <AuthListener/>
        // right after mount. localStorage exists only in the browser, so the server HTML is
        // always signed-out. (zustand v5's hook already hydrates React from getInitialState(),
        // which avoids a mismatch on its own — verified with a prod build — but hydrating at a
        // known point is explicit, doesn't lean on that library detail, and gives us
        // `hasHydrated` for SignInGate.)
        skipHydration: true,
        // The persisted slice is a DISPLAY HINT (who was signed in, to avoid a sign-in flash),
        // never proof of a session: `sessionChecked` is not persisted, so every boot re-validates
        // the session with Supabase (INITIAL_SESSION / checkSession).
        partialize: state => ({
          user: state.user,
          profile: state.profile,
          isAuthenticated: state.isAuthenticated,
        }),
        // Older (v1) entries also carried `sessionChecked: true`; whitelist the hint fields so a
        // stale flag can't short-circuit the boot-time session check.
        merge: (persisted, current) => {
          const p = (persisted ?? {}) as Partial<AuthState>;
          return {
            ...current,
            ...(p.user !== undefined && { user: p.user }),
            ...(p.profile !== undefined && { profile: p.profile }),
            ...(p.isAuthenticated !== undefined && { isAuthenticated: p.isAuthenticated }),
          };
        },
      }
    ),
    {
      name: 'auth-store',
    }
  )
);

/**
 * Read the persisted auth hint from localStorage and mark the store hydrated. Client-only; call it
 * from a layout effect after mount (see <AuthListener/>) so the server HTML and the first client
 * render agree. Synchronous for localStorage, so the hydrated state commits before first paint.
 */
export function rehydrateAuthStore(): void {
  if (typeof window === 'undefined' || useAuthStore.getState().hasHydrated) return;
  try {
    void useAuthStore.persist.rehydrate();
  } catch {
    // Storage blocked → start signed-out; the session check below still restores a live session.
  }
  useAuthStore.setState({ hasHydrated: true, sessionHint: readAuthHint() });
}

/**
 * Is the auth state still unresolved for UI purposes? True before hydration (server HTML + first
 * client render), and after it while a likely-signed-in browser (`sessionHint`) awaits the session
 * check. Pending UI shows a neutral skeleton/spinner — never the signed-out page or a sign-in gate.
 */
export function selectAuthPending(
  s: Pick<AuthState, 'hasHydrated' | 'isAuthenticated' | 'sessionChecked' | 'sessionHint'>
): boolean {
  return !s.hasHydrated || (!s.isAuthenticated && !s.sessionChecked && s.sessionHint);
}

export const useAuthPending = () => useAuthStore(selectAuthPending);

/** Grace period letting the OAuth listener claim the session before the manual check runs. */
const SESSION_CHECK_DELAY_MS = 100;

let listenerInstalled = false;

/**
 * Install the OAuth session listener + the delayed manual session check. Called from the
 * `<AuthListener/>` client component in Providers (NOT at module import — import-time I/O made
 * every test that touched `useAuth` fire network calls and timers).
 */
export function initAuthListener(): void {
  if (listenerInstalled || typeof window === 'undefined') return;
  listenerInstalled = true;
  const authService = getAuthService();

  // Listen for auth state changes and update store accordingly
  authService.onAuthStateChange(async event => {
    const { session, user } = event;

    if (session && user) {
      // User signed in via OAuth or other means
      try {
        // Get user profile
        const profile = await profilesApi.fetchProfile(user.id);

        useAuthStore.setState({
          user: { ...user, profile: profile || undefined },
          profile,
          isAuthenticated: true,
          sessionChecked: true,
          isLoading: false,
          error: null,
          lastUpdated: new Date(),
        });
      } catch (error) {
        captureError(error, { 'error.surface': 'auth.oauth-profile' });
        useAuthStore.setState({
          user: { ...user },
          profile: null,
          isAuthenticated: true,
          sessionChecked: true,
          isLoading: false,
          lastUpdated: new Date(),
        });
      }
    } else {
      // User signed out or no session. If someone WAS signed in (sign-out in another tab, an
      // expired refresh token), drop their cached data along with the session.
      if (useAuthStore.getState().isAuthenticated) getQueryClient().clear();
      useAuthStore.setState({
        user: null,
        profile: null,
        isAuthenticated: false,
        sessionChecked: true,
        isLoading: false,
        error: null,
      });
    }
  });

  // Only check session manually if we haven't done so yet and no OAuth is in progress
  setTimeout(() => {
    const state = useAuthStore.getState();
    const hasOAuthParams =
      window.location.href.includes('code=') ||
      window.location.href.includes('access_token') ||
      window.location.pathname === '/auth/callback';

    if (!state.sessionChecked && !hasOAuthParams) {
      void state.checkSession();
    }
  }, SESSION_CHECK_DELAY_MS);
}

// Convenience selectors using useShallow to prevent infinite loops
export const useAuth = () =>
  useAuthStore(
    useShallow(state => ({
      user: state.user,
      profile: state.profile,
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isLoading,
      error: state.error,
      hasHydrated: state.hasHydrated,
    }))
  );

export const useAuthActions = () =>
  useAuthStore(
    useShallow(state => ({
      signOut: state.signOut,
      signInWithProvider: state.signInWithProvider,
      checkSession: state.checkSession,
    }))
  );
