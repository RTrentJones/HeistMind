// Discord-surface → campaign resolution (bot phase 2). The interaction payload carries the
// guild id, the channel id, and the channel's parent id — so channel links, category links, and
// (thread → parent channel) all resolve with no extra fetch; the repository applies precedence
// (channel → category → the guild-wide default). The ONE case the payload can't answer — a
// thread whose PARENT CHANNEL is only covered by a CATEGORY link — retries through an optional
// bot-token channel fetch (F66; wired when DISCORD_BOT_TOKEN is configured).
import type { APIInteraction } from 'discord-api-types/v10';
import type { Game } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';

/** Resolves a channel's parent (category) id — null on any trouble. See `makeChannelParentFetcher`. */
export type ChannelParentFetcher = (channelId: string) => Promise<string | null>;

// Thread channel types (public / private / announcement) — their parent_id is a CHANNEL, not a
// category, so only they need the F66 retry.
const THREAD_TYPES = new Set([10, 11, 12]);

/** The candidate snowflakes for this interaction, in precedence order. */
export function linkCandidates(
  interaction: Pick<APIInteraction, 'channel'> & { guild_id?: string }
): { guildId: string; candidates: string[] } | null {
  const guildId = interaction.guild_id;
  if (!guildId) return null; // DMs / group chats can't be linked surfaces
  const channel = interaction.channel as { id?: string; parent_id?: string | null } | undefined;
  const candidates = [channel?.id, channel?.parent_id].filter(
    (id): id is string => typeof id === 'string' && id.length > 0
  );
  return { guildId, candidates };
}

/** The campaign linked to this interaction's surface, or null. */
export async function resolveLinkedGame(
  repos: DatabaseRepositories,
  interaction: Pick<APIInteraction, 'channel'> & { guild_id?: string },
  fetchChannelParent?: ChannelParentFetcher | null
): Promise<Game | null> {
  const surface = linkCandidates(interaction);
  if (!surface) return null;
  const found = await repos.games.findByDiscordChannel(surface.guildId, surface.candidates);
  if (!found.success) return null;
  if (found.data) return found.data;

  // F66 — in a THREAD, the payload's parent_id is the parent CHANNEL, so a category-only link
  // is invisible above. One bot-token fetch resolves that channel's category, then retry.
  const channel = interaction.channel as { type?: number; parent_id?: string | null } | undefined;
  if (!fetchChannelParent || !channel?.parent_id || !THREAD_TYPES.has(channel.type ?? -1)) {
    return null;
  }
  const categoryId = await fetchChannelParent(channel.parent_id);
  if (!categoryId) return null;
  const viaCategory = await repos.games.findByDiscordChannel(surface.guildId, [categoryId]);
  return viaCategory.success ? viaCategory.data : null;
}
