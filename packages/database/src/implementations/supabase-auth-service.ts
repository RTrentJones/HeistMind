// Supabase implementation of AuthService
// Handles authentication for the web app (the bot resolves actors via profiles.findByDiscordId).

import type {
  SupabaseClient,
  Session as SupabaseSession,
  User as SupabaseUser,
} from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import type {
  AuthService,
  User,
  Session,
  AuthResponse,
  AuthError,
  SignUpData,
  SignInData,
  SignInWithOAuthData,
  ResetPasswordData,
  UpdateUserData,
  AuthEvent,
  AuthEventCallback,
  OAuthProvider,
} from '../auth-types';

export class SupabaseAuthService implements AuthService {
  private eventCallbacks: AuthEventCallback[] = [];

  constructor(private supabase: SupabaseClient<Database>) {
    // Set up auth state change listener
    this.supabase.auth.onAuthStateChange((event, session) => {
      const authEvent: AuthEvent = {
        event: event as AuthEvent['event'],
        session: session ? this.transformSupabaseSession(session) : null,
        user: session?.user ? this.transformSupabaseUser(session.user) : null,
      };
      this.notifyCallbacks(authEvent);
    });
  }

  // ===========================
  // USER MANAGEMENT
  // ===========================

  async getCurrentUser(): Promise<User | null> {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return this.transformSupabaseUser(user);
  }

  async getCurrentSession(): Promise<Session | null> {
    const {
      data: { session },
      error,
    } = await this.supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    return this.transformSupabaseSession(session);
  }

  // ===========================
  // AUTHENTICATION
  // ===========================

  async signUp(data: SignUpData): Promise<AuthResponse<Session>> {
    const { data: authData, error } = await this.supabase.auth.signUp({
      email: data.email,
      password: data.password,
      ...(data.options !== undefined ? { options: data.options } : {}),
    });

    if (error) {
      return {
        data: null,
        error: this.transformSupabaseError(error),
      };
    }

    return {
      data: authData.session ? this.transformSupabaseSession(authData.session) : null,
      error: null,
    };
  }

  async signIn(data: SignInData): Promise<AuthResponse<Session>> {
    const { data: authData, error } = await this.supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return {
        data: null,
        error: this.transformSupabaseError(error),
      };
    }

    return {
      data: this.transformSupabaseSession(authData.session),
      error: null,
    };
  }

  async signInWithOAuth(data: SignInWithOAuthData): Promise<AuthResponse<never>> {
    const redirectUrl = this.getRedirectUrl(data.provider);

    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: data.provider,
      options: {
        redirectTo: redirectUrl,
        ...data.options,
      },
    });

    if (error) {
      return {
        data: null,
        error: this.transformSupabaseError(error),
      };
    }

    return {
      data: null,
      error: null,
    };
  }

  async signOut(): Promise<AuthResponse<never>> {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      return {
        data: null,
        error: this.transformSupabaseError(error),
      };
    }

    return {
      data: null,
      error: null,
    };
  }

  // ===========================
  // PASSWORD MANAGEMENT
  // ===========================

  async resetPassword(data: ResetPasswordData): Promise<AuthResponse<never>> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(data.email, data.options);

    if (error) {
      return {
        data: null,
        error: this.transformSupabaseError(error),
      };
    }

    return {
      data: null,
      error: null,
    };
  }

  async updateUser(data: UpdateUserData): Promise<AuthResponse<User>> {
    const { data: userData, error } = await this.supabase.auth.updateUser(data);

    if (error) {
      return {
        data: null,
        error: this.transformSupabaseError(error),
      };
    }

    return {
      data: this.transformSupabaseUser(userData.user),
      error: null,
    };
  }

  // ===========================
  // SESSION MANAGEMENT
  // ===========================

  async refreshSession(): Promise<AuthResponse<Session>> {
    const { data: authData, error } = await this.supabase.auth.refreshSession();

    if (error) {
      return {
        data: null,
        error: this.transformSupabaseError(error),
      };
    }

    return {
      data: authData.session ? this.transformSupabaseSession(authData.session) : null,
      error: null,
    };
  }

  async setSession(session: Session): Promise<AuthResponse<Session>> {
    const { data: authData, error } = await this.supabase.auth.setSession({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });

    if (error) {
      return {
        data: null,
        error: this.transformSupabaseError(error),
      };
    }

    return {
      data: authData.session ? this.transformSupabaseSession(authData.session) : null,
      error: null,
    };
  }

  // ===========================
  // DISCORD BOT INTEGRATION
  // ===========================

  // ===========================
  // EVENT HANDLING
  // ===========================

  onAuthStateChange(callback: AuthEventCallback): () => void {
    this.eventCallbacks.push(callback);

    return () => {
      const index = this.eventCallbacks.indexOf(callback);
      if (index > -1) {
        this.eventCallbacks.splice(index, 1);
      }
    };
  }

  // ===========================
  // UTILITIES
  // ===========================

  getRedirectUrl(provider: OAuthProvider): string {
    // For browser environments, use the current origin
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/auth/callback?provider=${provider}`;
    }

    // For server environments, try multiple environment variables
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || // Production/custom env
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}` // Vercel deployment
        : process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` // Vercel client-side
          : 'http://localhost:3000'; // Local development fallback

    return `${baseUrl}/auth/callback?provider=${provider}`;
  }

  async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentSession();
    return session !== null;
  }

  // ===========================
  // PRIVATE HELPERS
  // ===========================

  private transformSupabaseUser(user: SupabaseUser): User {
    return {
      id: user.id,
      email: user.email || null,
      emailVerified: user.email_confirmed_at !== null,
      phone: user.phone || null,
      phoneVerified: user.phone_confirmed_at !== null,
      createdAt: user.created_at ? new Date(user.created_at) : new Date(),
      updatedAt: user.updated_at ? new Date(user.updated_at) : new Date(),
      lastSignInAt: user.last_sign_in_at ? new Date(user.last_sign_in_at) : null,
      appMetadata: user.app_metadata || {},
      userMetadata: user.user_metadata || {},
    };
  }

  private transformSupabaseSession(session: SupabaseSession): Session {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : new Date(0),
      tokenType: session.token_type,
      user: this.transformSupabaseUser(session.user),
    };
  }

  private transformSupabaseError(error: {
    message: string;
    status?: number | undefined;
    code?: string | undefined;
    error_code?: string | undefined;
  }): AuthError {
    return {
      message: error.message,
      status: error.status,
      code: error.code || error.error_code,
    };
  }

  private notifyCallbacks(event: AuthEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Auth event callback error:', error);
      }
    });
  }

}
