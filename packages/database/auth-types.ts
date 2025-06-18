// Authentication types for HeistMind
// Database-agnostic authentication interfaces and types

// ===========================
// USER AUTHENTICATION
// ===========================

export interface User {
  id: string;
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSignInAt: Date | null;
  appMetadata: Record<string, any>;
  userMetadata: Record<string, any>;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: string;
  user: User;
}

export interface AuthResponse<T = Session> {
  data: T | null;
  error: AuthError | null;
}

export interface AuthError {
  message: string;
  status?: number;
  code?: string;
}

// ===========================
// AUTHENTICATION METHODS
// ===========================

export interface SignUpData {
  email: string;
  password: string;
  options?: {
    data?: Record<string, any>;
    redirectTo?: string;
    captchaToken?: string;
  };
}

export interface SignInData {
  email: string;
  password: string;
  options?: {
    redirectTo?: string;
    captchaToken?: string;
  };
}

export interface SignInWithOAuthData {
  provider: OAuthProvider;
  options?: {
    redirectTo?: string;
    queryParams?: Record<string, string>;
    scopes?: string;
  };
}

export interface SignInWithDiscordData {
  code: string;
  redirectUri: string;
}

export interface ResetPasswordData {
  email: string;
  options?: {
    redirectTo?: string;
    captchaToken?: string;
  };
}

export interface UpdateUserData {
  email?: string;
  password?: string;
  phone?: string;
  data?: Record<string, any>;
}

// ===========================
// OAUTH PROVIDERS
// ===========================

export type OAuthProvider =
  | 'discord'
  | 'google'
  | 'github'
  | 'apple'
  | 'azure'
  | 'facebook'
  | 'figma'
  | 'gitlab'
  | 'kakao'
  | 'keycloak'
  | 'linkedin'
  | 'notion'
  | 'slack'
  | 'spotify'
  | 'twitch'
  | 'twitter'
  | 'workos'
  | 'zoom';

// ===========================
// DISCORD BOT INTEGRATION
// ===========================

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  globalName: string | null;
  avatar: string | null;
  bot?: boolean;
  system?: boolean;
  mfaEnabled?: boolean;
  banner?: string | null;
  accentColor?: number | null;
  locale?: string;
  verified?: boolean;
  email?: string | null;
  flags?: number;
  premiumType?: number;
  publicFlags?: number;
}

export interface DiscordAuthData {
  discordUser: DiscordUser;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope: string;
  tokenType: string;
}

// ===========================
// AUTH EVENT TYPES
// ===========================

export type AuthEventType =
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY'
  | 'USER_DELETED';

export interface AuthEvent {
  event: AuthEventType;
  session: Session | null;
  user: User | null;
}

export type AuthEventCallback = (event: AuthEvent) => void;

// ===========================
// AUTHENTICATION SERVICE
// ===========================

export interface AuthService {
  // User management
  getCurrentUser(): Promise<User | null>;
  getCurrentSession(): Promise<Session | null>;

  // Authentication
  signUp(data: SignUpData): Promise<AuthResponse<Session>>;
  signIn(data: SignInData): Promise<AuthResponse<Session>>;
  signInWithOAuth(data: SignInWithOAuthData): Promise<AuthResponse<never>>;
  signInWithDiscord(data: SignInWithDiscordData): Promise<AuthResponse<Session>>;
  signOut(): Promise<AuthResponse<never>>;

  // Password management
  resetPassword(data: ResetPasswordData): Promise<AuthResponse<never>>;
  updateUser(data: UpdateUserData): Promise<AuthResponse<User>>;

  // Session management
  refreshSession(): Promise<AuthResponse<Session>>;
  setSession(session: Session): Promise<AuthResponse<Session>>;

  // Discord bot integration
  linkDiscordAccount(userId: string, discordData: DiscordAuthData): Promise<AuthResponse<User>>;
  unlinkDiscordAccount(userId: string): Promise<AuthResponse<User>>;
  getUserByDiscordId(discordId: string): Promise<User | null>;

  // Event handling
  onAuthStateChange(callback: AuthEventCallback): () => void;

  // Utilities
  getRedirectUrl(provider: OAuthProvider): string;
  isAuthenticated(): Promise<boolean>;
}

// ===========================
// CONTEXT TYPES
// ===========================

export interface AuthContext {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<AuthResponse<Session>>;
  signIn: (data: SignInData) => Promise<AuthResponse<Session>>;
  signInWithOAuth: (data: SignInWithOAuthData) => Promise<AuthResponse<never>>;
  signOut: () => Promise<AuthResponse<never>>;
  updateUser: (data: UpdateUserData) => Promise<AuthResponse<User>>;
  resetPassword: (data: ResetPasswordData) => Promise<AuthResponse<never>>;
}

// ===========================
// CONFIGURATION
// ===========================

export interface AuthConfig {
  provider: 'supabase';
  supabase?: {
    url?: string;
    key?: string;
    redirectUrl?: string;
    cookieOptions?: {
      name?: string;
      lifetime?: number;
      domain?: string;
      path?: string;
      sameSite?: 'lax' | 'strict' | 'none';
    };
  };
  discord?: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    botToken?: string;
  };
}

// ===========================
// RESULT TYPES
// ===========================

export type AuthResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: AuthError;
    };
