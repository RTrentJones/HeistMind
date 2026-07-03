// The interaction router: PING handshake, command dispatch, and (Phase 1) autocomplete. Unknown
// anything answers ephemerally — a bot must always respond within the 3s window or the user sees
// "The application did not respond".
import {
  InteractionResponseType,
  InteractionType,
  type APIInteraction,
  type APIInteractionResponse,
} from 'discord-api-types/v10';
import { makeDiceHandler } from './commands/dice';
import { handleFortune } from './commands/fortune';
import { handleHeist } from './commands/heist';
import { handleResist } from './commands/resist';
import { handleRoll } from './commands/roll';
import { realizeDice } from './dice';
import { copy } from './format/copy';
import { pong, reply } from './respond';
import type { BotContext, CommandHandler } from './types';

const HANDLERS: Record<string, CommandHandler> = {
  roll: handleRoll,
  resist: handleResist,
  fortune: handleFortune,
  dice: makeDiceHandler(realizeDice),
  heist: handleHeist,
};

export async function handleInteraction(
  ctx: BotContext,
  interaction: APIInteraction
): Promise<APIInteractionResponse> {
  if (interaction.type === InteractionType.Ping) return pong();

  if (interaction.type === InteractionType.ApplicationCommand) {
    const handler = HANDLERS[interaction.data.name];
    if (!handler) return reply(copy.unknownCommand, { ephemeral: true });
    return handler(ctx, interaction);
  }

  if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
    // Phase 1 wires real suggestions; an empty list degrades gracefully everywhere.
    return { type: InteractionResponseType.ApplicationCommandAutocompleteResult, data: { choices: [] } };
  }

  return reply(copy.unknownCommand, { ephemeral: true });
}
