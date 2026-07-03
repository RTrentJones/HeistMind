// The bot's authorization prelude. The service-role client BYPASSES Postgres RLS, so every
// repos-touching handler resolves the acting profile and asserts ownership/membership HERE,
// before dice are realized or the engine is called. Failures phrase as ephemeral copy; nothing
// about other players' data leaks to non-owners.
import type { Profile } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';

/** discord_id → profile is effectively immutable, so a small TTL cache survives warm lambdas. */
const ACTOR_TTL_MS = 5 * 60 * 1000;
const ACTOR_CACHE_MAX = 500;
const actorCache = new Map<string, { profile: Profile; at: number }>();

/** Test seam: clear the module-level cache. */
export function clearActorCache(): void {
  actorCache.clear();
}

/**
 * Resolve the Discord user to their HeistMind profile (the unique `profiles.discord_id` the web
 * OAuth signup populates). Null = no linked account — the caller replies with the sign-in copy.
 */
export async function resolveActor(
  repos: DatabaseRepositories,
  discordUserId: string
): Promise<Profile | null> {
  const cached = actorCache.get(discordUserId);
  if (cached && Date.now() - cached.at < ACTOR_TTL_MS) return cached.profile;

  const found = await repos.profiles.findByDiscordId(discordUserId);
  if (!found.success || !found.data) return null;

  if (actorCache.size >= ACTOR_CACHE_MAX) {
    const oldest = actorCache.keys().next().value;
    if (oldest !== undefined) actorCache.delete(oldest);
  }
  actorCache.set(discordUserId, { profile: found.data, at: Date.now() });
  return found.data;
}

/** Whether the actor owns the character (creator = owner; the GM route arrives in Phase 2/3). */
export async function ownsCharacter(
  repos: DatabaseRepositories,
  actorId: string,
  characterId: string
): Promise<boolean> {
  const found = await repos.characters.findById(characterId);
  return found.success && !!found.data && found.data.createdBy === actorId;
}
