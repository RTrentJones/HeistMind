// Interaction-response builders — the only place response envelopes are shaped. (Phase 1 adds
// the deferred-response + follow-up webhook machinery here, with an injectable API base so
// tests capture follow-ups locally.)
import {
  InteractionResponseType,
  MessageFlags,
  type APIEmbed,
  type APIInteractionResponse,
} from 'discord-api-types/v10';

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
