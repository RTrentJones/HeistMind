// The interaction router: PING handshake, command dispatch, and autocomplete. Unknown anything
// answers ephemerally — a bot must always respond within the 3s window or the user sees
// "The application did not respond". DB-touching handlers defer first (HandlerResult.work runs
// in the transport's after()).
import {
  InteractionResponseType,
  InteractionType,
  type APIInteraction,
} from 'discord-api-types/v10';
import { characterAutocomplete, handleCharacter } from './commands/character';
import { makeDiceHandler } from './commands/dice';
import { handleFortune } from './commands/fortune';
import { handleHeist, heistAutocomplete } from './commands/heist';
import { handleLog } from './commands/log';
import { handleResist } from './commands/resist';
import { handleRoll, rollAutocomplete } from './commands/roll';
import { realizeDice } from './dice';
import { copy } from './format/copy';
import { inline, pong, reply } from './respond';
import type { BotContext, CommandHandler, HandlerResult } from './types';

const HANDLERS: Record<string, CommandHandler> = {
  roll: handleRoll,
  resist: handleResist,
  fortune: handleFortune,
  dice: makeDiceHandler(realizeDice),
  heist: handleHeist,
  character: handleCharacter,
  log: handleLog,
};

export async function handleInteraction(
  ctx: BotContext,
  interaction: APIInteraction
): Promise<HandlerResult> {
  if (interaction.type === InteractionType.Ping) return inline(pong());

  if (interaction.type === InteractionType.ApplicationCommand) {
    const handler = HANDLERS[interaction.data.name];
    if (!handler) return inline(reply(copy.unknownCommand, { ephemeral: true }));
    return handler(ctx, interaction);
  }

  if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
    // Autocomplete shares the 3s budget with NO defer — suggesters must stay to a couple of
    // indexed queries and degrade to [] on any trouble (values are validated on submit anyway).
    const choices =
      interaction.data.name === 'character'
        ? await characterAutocomplete(ctx, interaction)
        : interaction.data.name === 'roll'
          ? await rollAutocomplete(ctx, interaction)
          : interaction.data.name === 'heist'
            ? await heistAutocomplete(ctx, interaction)
            : [];
    return inline({
      type: InteractionResponseType.ApplicationCommandAutocompleteResult,
      data: { choices },
    });
  }

  return inline(reply(copy.unknownCommand, { ephemeral: true }));
}
