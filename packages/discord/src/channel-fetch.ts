// F66 — the app's FIRST bot-token REST call. Everything else the bot does rides the interaction
// webhook (no token needed); resolving a thread's parent channel's CATEGORY is the one lookup
// the interaction payload can't answer. Best-effort by design: any failure returns null and link
// resolution simply behaves as before (thread under a category link stays "not linked").
import type { ChannelParentFetcher } from './links';

const DISCORD_API = 'https://discord.com/api/v10';

/**
 * Build the channel→parent(category) resolver from the bot token, or null when the deployment
 * has none configured (the retry is skipped, never erroring a command).
 */
export function makeChannelParentFetcher(
  botToken: string | undefined
): ChannelParentFetcher | null {
  if (!botToken) return null;
  return async channelId => {
    try {
      const res = await fetch(`${DISCORD_API}/channels/${channelId}`, {
        headers: { Authorization: `Bot ${botToken}` },
      });
      if (!res.ok) return null;
      const channel = (await res.json()) as { parent_id?: string | null };
      return channel.parent_id ?? null;
    } catch {
      return null;
    }
  };
}
