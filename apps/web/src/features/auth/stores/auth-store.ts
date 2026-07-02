import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { type Profile } from '@heist-mind/core';
import { type User } from '@heist-mind/database';
import { type LoadingState } from '@/shared/types';
import { captureError } from '@heist-mind/telemetry';
import { getAuthService } from '@/lib/auth';
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

  // Auth actions (Discord OAuth is the only sign-in method — see BRD; the profile row is created
  // by the DB trigger on first sign-in, so there is no client-side signup/profile-create path).
  signOut: () => Promise<void>;
  signInWithProvider: (provider: 'google' | 'discord') => Promise<void>;

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
              lastUpdated: new Date(),
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Sign out failed',
              isLoading: false,
            });
            throw error;
          }
        },

        signInWithProvider: async (provider: 'google' | 'discord') => {
          set({ isLoading: true, error: null });
          try {
            const authService = getAuthService();
            const result = await authService.signInWithOAuth({ provider });

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
        partialize: state => ({
          // Only persist essential auth state
          user: state.user,
          profile: state.profile,
          isAuthenticated: state.isAuthenticated,
          sessionChecked: state.sessionChecked,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);

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
      // User signed out or no session
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
