// @heist-mind/discord — HeistMind's Discord client. The web app's /api/discord route is a thin
// transport over this package: verify the signature (raw bytes!), build a BotContext, hand the
// parsed interaction to handleInteraction. Handlers are pure and unit-tested with fake contexts;
// dice are realized via the injected ctx.realize (CSPRNG in production).
export { handleInteraction } from './router';
export { verifyDiscordRequest } from './verify';
export { realizeD6, realizeDice } from './dice';
export { COMMAND_MANIFEST } from './commands/manifest';
export type { BotContext, CommandHandler } from './types';
// Re-exported so the transport (the web route) needs no discord-api-types dependency.
export type { APIInteraction, APIInteractionResponse } from 'discord-api-types/v10';
