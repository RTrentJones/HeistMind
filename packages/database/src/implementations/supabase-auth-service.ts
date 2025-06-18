// Supabase implementation of AuthService
// Handles authentication for both web and Discord bot applications

import type { SupabaseClient } from '@supabase/supabase-js';
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
  SignInWithDiscordData,
  ResetPasswordData,
  UpdateUserData,
  AuthEvent,
  AuthEventCallback,
  DiscordAuthData,
  OAuthProvider,
  AuthResult,
} from '../auth-types';

export class SupabaseAuthService implements AuthService {
  private eventCallbacks: AuthEventCallback[] = [];

  constructor(private supabase: SupabaseClient<Database>) {
    // Set up auth state change listener
    this.supabase.auth.onAuthStateChange((event, session) => {
      const authEvent: AuthEvent = {
        event: event as any,
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
      options: data.options,
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

  async signInWithDiscord(data: SignInWithDiscordData): Promise<AuthResponse<Session>> {
    // Custom Discord authentication flow for bot integration
    // This exchanges the Discord code for tokens and creates a Supabase session

    try {
      // Exchange Discord code for access token
      const discordTokenResponse = await this.exchangeDiscordCode(data.code, data.redirectUri);

      // Get Discord user info
      const discordUser = await this.getDiscordUser(discordTokenResponse.access_token);

      // For Discord bot integration, we need to handle this differently
      // This is a simplified version - in practice, you'd need to:
      // 1. Check if user exists by Discord ID
      // 2. Create new user or link existing user
      // 3. Create a custom session

      // For now, we'll return an error indicating this needs custom implementation
      return {
        data: null,
        error: {
          message: 'Discord bot authentication requires custom implementation',
          code: 'DISCORD_BOT_AUTH_NOT_IMPLEMENTED',
        },
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Discord authentication failed',
          code: 'DISCORD_AUTH_ERROR',
        },
      };
    }
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

  async linkDiscordAccount(
    userId: string,
    discordData: DiscordAuthData
  ): Promise<AuthResponse<User>> {
    try {
      // Update user metadata with Discord information
      const { data: userData, error } = await this.supabase.auth.updateUser({
        data: {
          discord_id: discordData.discordUser.id,
          discord_username: discordData.discordUser.username,
          discord_discriminator: discordData.discordUser.discriminator,
          discord_avatar: discordData.discordUser.avatar,
          discord_access_token: discordData.accessToken,
          discord_refresh_token: discordData.refreshToken,
        },
      });

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
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to link Discord account',
          code: 'DISCORD_LINK_ERROR',
        },
      };
    }
  }

  async unlinkDiscordAccount(userId: string): Promise<AuthResponse<User>> {
    try {
      const { data: userData, error } = await this.supabase.auth.updateUser({
        data: {
          discord_id: null,
          discord_username: null,
          discord_discriminator: null,
          discord_avatar: null,
          discord_access_token: null,
          discord_refresh_token: null,
        },
      });

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
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to unlink Discord account',
          code: 'DISCORD_UNLINK_ERROR',
        },
      };
    }
  }

  async getUserByDiscordId(discordId: string): Promise<User | null> {
    try {
      // Query profiles table for user with matching Discord ID
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('discord_id', discordId)
        .single();

      if (error || !data) {
        return null;
      }

      // Get full user data
      const {
        data: { user },
        error: userError,
      } = await this.supabase.auth.admin.getUserById(data.id);

      if (userError || !user) {
        return null;
      }

      return this.transformSupabaseUser(user);
    } catch {
      return null;
    }
  }

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

  private transformSupabaseUser(user: any): User {
    return {
      id: user.id,
      email: user.email || null,
      emailVerified: user.email_confirmed_at !== null,
      phone: user.phone || null,
      phoneVerified: user.phone_confirmed_at !== null,
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at),
      lastSignInAt: user.last_sign_in_at ? new Date(user.last_sign_in_at) : null,
      appMetadata: user.app_metadata || {},
      userMetadata: user.user_metadata || {},
    };
  }

  private transformSupabaseSession(session: any): Session {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: new Date(session.expires_at * 1000),
      tokenType: session.token_type,
      user: this.transformSupabaseUser(session.user),
    };
  }

  private transformSupabaseError(error: any): AuthError {
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

  private async exchangeDiscordCode(code: string, redirectUri: string): Promise<any> {
    const clientId = process.env.DISCORD_CLIENT_ID!;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET!;

    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange Discord code for token');
    }

    return response.json();
  }

  private async getDiscordUser(accessToken: string): Promise<any> {
    const response = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get Discord user info');
    }

    return response.json();
  }
}
