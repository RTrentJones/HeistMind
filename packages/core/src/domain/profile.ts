// Player profile (created by the DB trigger on first Discord OAuth sign-in).
export interface Profile {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  preferences: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileData {
  username?: string;
  avatarUrl?: string;
}
