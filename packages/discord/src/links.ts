// Discord-surface → campaign resolution (bot phase 2). The interaction payload carries the
// guild id, the channel id, and the channel's parent id — so channel links, category links, and
// (thread → parent channel) all resolve with no extra fetch; the repository applies precedence
// (channel → category → the guild-wide default). Known gap, documented in the plan: a thread
// whose PARENT CHANNEL is only covered by a category link would need a bot-token channel fetch.
import type { APIInteraction } from 'discord-api-types/v10';
import type { Game } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';

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
  interaction: Pick<APIInteraction, 'channel'> & { guild_id?: string }
): Promise<Game | null> {
  const surface = linkCandidates(interaction);
  if (!surface) return null;
  const found = await repos.games.findByDiscordChannel(surface.guildId, surface.candidates);
  return found.success ? found.data : null;
}
