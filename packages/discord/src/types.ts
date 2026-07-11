// The bot's handler seam. Handlers are pure functions (interaction in → HandlerResult out) over a
// context the transport builds once per request — the same dependency-injection shape as the
// engine's `(repos, input)`, so tests drive them with fakes and no Discord, no network.
import type {
  APIApplicationCommandInteraction,
  APIInteractionResponse,
} from 'discord-api-types/v10';
import type { DatabaseRepositories } from '@heist-mind/database';

export interface BotContext {
  /**
   * Realize a dice pool (1–6 faces). Injected so handlers stay deterministic under test —
   * the same "dice are realized by the caller" contract the engine holds.
   */
  realize: (count: number) => number[];
  /** Deployed commit SHA (or 'local'), surfaced by /heist about as the deploy probe. */
  deploySha: string;
  /** The web app's public URL, for sign-in links in replies. */
  siteUrl: string;
  /**
   * The service-role repositories — null when the deployment has no Supabase creds, in which
   * case account-backed commands reply "not configured" and the pure-compute commands still work.
   * SECURITY: the service role bypasses RLS; every handler that touches repos MUST run the
   * authz prelude (resolve actor → assert ownership/membership) before acting.
   */
  repos: DatabaseRepositories | null;
  /**
   * Resolve a channel's parent (category) id via a bot-token REST fetch — the ONE link-resolution
   * case the interaction payload can't answer: a thread under a channel that's only
   * CATEGORY-linked (F66). Absent/null without a bot token; the retry is then skipped.
   */
  fetchChannelParent?: ((channelId: string) => Promise<string | null>) | null;
}

/**
 * Sends follow-ups for a DEFERRED interaction (the type-5 ack was already returned; Discord
 * gives ~15 minutes on the interaction token). Built by the transport with the interaction's
 * application_id + token; the API base is injectable so tests capture instead of calling Discord.
 */
export interface FollowUpClient {
  /** Replace the deferred placeholder with the real reply. */
  editOriginal(payload: { content?: string; embeds?: unknown[] }): Promise<void>;
  /** Remove a PUBLIC deferred placeholder (pair with sendEphemeral for authz failures). */
  deleteOriginal(): Promise<void>;
  /** Send a separate ephemeral message (only the invoker sees it). */
  sendEphemeral(content: string): Promise<void>;
}

export interface HandlerResult {
  /** The inline answer: a type-4 message, or a type-5 defer when `work` is present. */
  response: APIInteractionResponse;
  /** Deferred work the transport runs AFTER responding (Next `after()`), completing via webhook. */
  work?: (followUp: FollowUpClient) => Promise<void>;
}

export type CommandHandler = (
  ctx: BotContext,
  interaction: APIApplicationCommandInteraction
) => Promise<HandlerResult> | HandlerResult;
