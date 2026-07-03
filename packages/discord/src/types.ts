// The bot's handler seam. Handlers are pure functions (interaction in → response out) over a
// context the transport builds once per request — the same dependency-injection shape as the
// engine's `(repos, input)`, so tests drive them with fakes and no Discord, no network.
import type {
  APIApplicationCommandInteraction,
  APIInteractionResponse,
} from 'discord-api-types/v10';

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
}

export type CommandHandler = (
  ctx: BotContext,
  interaction: APIApplicationCommandInteraction
) => Promise<APIInteractionResponse> | APIInteractionResponse;
