import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { User, Profile, CreateProfileData } from '@heist-mind/database';
import { LoadingState } from '@/shared/types';
import { getAuthService, getRepositories } from '@/lib/auth';

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

  // Auth actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData?: Partial<CreateProfileData>) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithProvider: (provider: 'google' | 'discord') => Promise<void>;

  // Profile actions
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;

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
        signIn: async (email: string, password: string) => {
          set({ isLoading: true, error: null });
          try {
            const authService = getAuthService();
            const repositories = getRepositories();

            const authResult = await authService.signIn({ email, password });

            if (authResult.error || !authResult.data) {
              throw new Error(authResult.error?.message || 'Sign in failed');
            }

            const user = authResult.data.user;

            // Get user profile
            const profileResult = await repositories.profiles.findById(user.id);
            const profile = profileResult.success ? profileResult.data : null;

            set({
              user: { ...user, profile: profile || undefined },
              profile,
              isAuthenticated: true,
              isLoading: false,
              lastUpdated: new Date(),
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Sign in failed',
              isLoading: false,
            });
            throw error;
          }
        },

        signUp: async (email: string, password: string, userData?: Partial<CreateProfileData>) => {
          set({ isLoading: true, error: null });
          try {
            const authService = getAuthService();
            const repositories = getRepositories();

            const authResult = await authService.signUp({
              email,
              password,
              options: { data: userData },
            });

            if (authResult.error || !authResult.data) {
              throw new Error(authResult.error?.message || 'Sign up failed');
            }

            const user = authResult.data.user;

            // Create or get user profile
            let profile: Profile | null = null;
            if (userData) {
              const profileResult = await repositories.profiles.create({
                username: userData.username || `user_${user.id.slice(0, 8)}`,
                displayName: userData.displayName,
                avatarUrl: userData.avatarUrl,
                preferences: userData.preferences || {},
              });
              profile = profileResult.success ? profileResult.data : null;
            }

            set({
              user: { ...user, profile: profile || undefined },
              profile,
              isAuthenticated: true,
              isLoading: false,
              lastUpdated: new Date(),
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Sign up failed',
              isLoading: false,
            });
            throw error;
          }
        },

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

        // Profile actions
        updateProfile: async (data: Partial<Profile>) => {
          const { profile } = get();
          if (!profile) throw new Error('No profile to update');

          set({ isLoading: true, error: null });
          try {
            const repositories = getRepositories();
            const profileData = {
              username: data.username === null ? undefined : data.username,
              displayName: data.displayName === null ? undefined : data.displayName,
              avatarUrl: data.avatarUrl === null ? undefined : data.avatarUrl,
              preferences: data.preferences,
            };

            const result = await repositories.profiles.update(profile.id, profileData);

            if (!result.success) {
              throw new Error(result.error?.message || 'Profile update failed');
            }

            const updatedProfile = result.data;

            set((state: AuthState) => ({
              profile: updatedProfile,
              user: state.user ? { ...state.user, profile: updatedProfile } : null,
              isLoading: false,
              lastUpdated: new Date(),
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Profile update failed',
              isLoading: false,
            });
            throw error;
          }
        },

        refreshProfile: async () => {
          const { user } = get();
          if (!user?.id) return;

          set({ isLoading: true, error: null });
          try {
            const repositories = getRepositories();
            const result = await repositories.profiles.findById(user.id);

            const profile = result.success ? result.data : null;

            set((state: AuthState) => ({
              profile,
              user: state.user ? { ...state.user, profile: profile || undefined } : null,
              isLoading: false,
              lastUpdated: new Date(),
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Profile refresh failed',
              isLoading: false,
            });
          }
        },

        // Session management
        checkSession: async () => {
          if (get().sessionChecked) return;

          set({ isLoading: true, error: null });
          try {
            const authService = getAuthService();
            const repositories = getRepositories();

            const session = await authService.getCurrentSession();

            if (session?.user) {
              const profileResult = await repositories.profiles.findById(session.user.id);
              const profile = profileResult.success ? profileResult.data : null;

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

// Set up auth state change listener to handle OAuth automatically
if (typeof window !== 'undefined') {
  const authService = getAuthService();

  // Listen for auth state changes and update store accordingly
  authService.onAuthStateChange(async event => {
    const { session, user } = event;

    if (session && user) {
      // User signed in via OAuth or other means
      const repositories = getRepositories();

      try {
        // Get user profile
        const profileResult = await repositories.profiles.findById(user.id);
        const profile = profileResult.success ? profileResult.data : null;

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
        console.error('Error fetching profile after auth:', error);
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
      state.checkSession();
    }
  }, 100);
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
      signIn: state.signIn,
      signUp: state.signUp,
      signOut: state.signOut,
      signInWithProvider: state.signInWithProvider,
      updateProfile: state.updateProfile,
      refreshProfile: state.refreshProfile,
      checkSession: state.checkSession,
    }))
  );
