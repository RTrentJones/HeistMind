// The profiles data-access seam (non-hook side). The auth store runs outside React (Zustand
// actions + the module-level OAuth listener), so it consumes these plain functions instead of
// hooks; writes still invalidate through the shared QueryClient so the profile-name caches the
// hooks read from stay fresh.
import type { CreateProfileData, Profile, UpdateProfileData } from '@heist-mind/database';
import { getRepositories } from '@/lib/auth';
import { getQueryClient } from '@/lib/query/client';
import { unwrap } from '@/lib/query/result';
import { profileKeys } from './queries';

/**
 * A profile by id, or null when unavailable — session hydration proceeds without a profile rather
 * than failing sign-in (e.g. a first OAuth sign-in racing the profile-creation trigger).
 */
export async function fetchProfile(id: string): Promise<Profile | null> {
  const result = await getRepositories().profiles.findById(id);
  return result.success ? result.data : null;
}

/** Create a profile (the email sign-up path); null on failure — sign-up itself still succeeds. */
export async function createProfile(data: CreateProfileData): Promise<Profile | null> {
  const result = await getRepositories().profiles.create(data);
  if (!result.success) return null;
  getQueryClient().invalidateQueries({ queryKey: profileKeys.detail(result.data.id) });
  return result.data;
}

/** Update a profile; throws on failure. Invalidates the cached name lookups (roster/log). */
export async function updateProfile(id: string, data: UpdateProfileData): Promise<Profile> {
  const profile = await getRepositories().profiles.update(id, data).then(unwrap);
  getQueryClient().invalidateQueries({ queryKey: profileKeys.detail(id) });
  return profile;
}
