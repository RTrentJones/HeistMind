// Interaction-response builders + the deferred-reply machinery — the only place response
// envelopes and webhook follow-up calls are shaped. The API base is injectable so tests point
// follow-ups at a capture server instead of discord.com.
import {
  InteractionResponseType,
  MessageFlags,
  type APIEmbed,
  type APIInteractionResponse,
} from 'discord-api-types/v10';
import type { FollowUpClient, HandlerResult } from './types';

export function pong(): APIInteractionResponse {
  return { type: InteractionResponseType.Pong };
}

/** A plain text channel message; ephemeral shows it to the invoker only. */
export function reply(content: string, opts?: { ephemeral?: boolean }): APIInteractionResponse {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content,
      ...(opts?.ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
    },
  };
}

/** An embed message (rolls, sheets, snapshots). */
export function replyEmbed(
  embed: APIEmbed,
  opts?: { ephemeral?: boolean }
): APIInteractionResponse {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      embeds: [embed],
      ...(opts?.ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
    },
  };
}

/** Wrap an inline response as a HandlerResult (the no-deferred-work case). */
export function inline(response: APIInteractionResponse): HandlerResult {
  return { response };
}

/**
 * Defer + do the work after responding. The ephemeral flag is FINAL at defer time — a public
 * defer that then fails authz must deleteOriginal() + sendEphemeral() (the baked-in pattern).
 */
export function deferred(
  work: (followUp: FollowUpClient) => Promise<void>,
  opts?: { ephemeral?: boolean }
): HandlerResult {
  return {
    response: {
      type: InteractionResponseType.DeferredChannelMessageWithSource,
      ...(opts?.ephemeral ? { data: { flags: MessageFlags.Ephemeral } } : {}),
    },
    work,
  };
}

const DEFAULT_API_BASE = 'https://discord.com/api/v10';

/** The transport builds one per deferred interaction (application_id + token from the payload). */
export function makeFollowUpClient(
  applicationId: string,
  interactionToken: string,
  apiBase: string = process.env.DISCORD_API_BASE ?? DEFAULT_API_BASE
): FollowUpClient {
  const webhook = `${apiBase}/webhooks/${applicationId}/${interactionToken}`;
  const send = async (url: string, method: string, body?: unknown): Promise<void> => {
    const response = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      throw new Error(`Discord follow-up failed: ${method} ${url} → HTTP ${response.status}`);
    }
  };
  return {
    editOriginal: payload => send(`${webhook}/messages/@original`, 'PATCH', payload),
    deleteOriginal: () => send(`${webhook}/messages/@original`, 'DELETE'),
    sendEphemeral: content =>
      send(webhook, 'POST', { content, flags: MessageFlags.Ephemeral }),
  };
}
