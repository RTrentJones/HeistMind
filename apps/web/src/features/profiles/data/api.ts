// The profiles data-access seam (non-hook side). The auth store runs outside React (Zustand
// actions + the module-level OAuth listener), so it consumes these plain functions instead of
// hooks. (Profile creation is the DB trigger's job on first OAuth sign-in; profile editing has no
// surface yet — add a write function here with QueryClient invalidation when it does.)
import type { Profile } from '@heist-mind/core';
import { getAuthService, getRepositories } from '@/lib/auth';

/**
 * A profile by id, or null when unavailable — session hydration proceeds without a profile rather
 * than failing sign-in (e.g. a first OAuth sign-in racing the profile-creation trigger).
 */
export async function fetchProfile(id: string): Promise<Profile | null> {
  const result = await getRepositories().profiles.findById(id);
  return result.success ? result.data : null;
}

/**
 * Permanently delete the signed-in user's account via the service-role endpoint (the auth user
 * row cascades through profiles → games/characters/rulesets/rolls). The route can't read the
 * localStorage session, so the caller's access token rides the Authorization header. Throws on
 * failure; on success the caller still owns local cleanup (sign out + redirect).
 */
export async function deleteAccount(): Promise<void> {
  const session = await getAuthService().getCurrentSession();
  if (!session) {
    throw new Error('Not signed in.');
  }
  const res = await fetch('/api/account/delete', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Account deletion failed (${res.status}).`);
  }
}
