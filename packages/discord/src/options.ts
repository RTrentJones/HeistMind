// Typed readers over a chat-input interaction's options — flattening the one level of
// subcommand nesting Discord uses, so handlers ask for options by name and type.
import {
  ApplicationCommandOptionType,
  type APIApplicationCommandInteraction,
  type APIApplicationCommandInteractionDataBasicOption,
} from 'discord-api-types/v10';

type BasicOption = APIApplicationCommandInteractionDataBasicOption;

/** The invoked subcommand name (or null for a bare command). */
export function subcommandName(interaction: APIApplicationCommandInteraction): string | null {
  if (interaction.data.type !== 1) return null; // CHAT_INPUT only
  const first = interaction.data.options?.[0];
  return first && first.type === ApplicationCommandOptionType.Subcommand ? first.name : null;
}

/** The basic (value-bearing) options, whether at the top level or inside the subcommand. */
export function basicOptions(interaction: APIApplicationCommandInteraction): BasicOption[] {
  if (interaction.data.type !== 1) return [];
  const options = interaction.data.options ?? [];
  const first = options[0];
  if (first && first.type === ApplicationCommandOptionType.Subcommand) {
    return (first.options ?? []) as BasicOption[];
  }
  return options as BasicOption[];
}

// The runtime typeof checks double as narrowing: in autocomplete payloads Discord may deliver a
// focused numeric option's value as a string, so the library types some values as unions.
export function integerOption(
  interaction: APIApplicationCommandInteraction,
  name: string
): number | null {
  const opt = basicOptions(interaction).find(o => o.name === name);
  return opt && opt.type === ApplicationCommandOptionType.Integer && typeof opt.value === 'number'
    ? opt.value
    : null;
}

export function stringOption(
  interaction: APIApplicationCommandInteraction,
  name: string
): string | null {
  const opt = basicOptions(interaction).find(o => o.name === name);
  return opt && opt.type === ApplicationCommandOptionType.String && typeof opt.value === 'string'
    ? opt.value
    : null;
}

export function booleanOption(
  interaction: APIApplicationCommandInteraction,
  name: string
): boolean | null {
  const opt = basicOptions(interaction).find(o => o.name === name);
  return opt && opt.type === ApplicationCommandOptionType.Boolean && typeof opt.value === 'boolean'
    ? opt.value
    : null;
}

/**
 * The focused/typed value of an autocomplete option, lowercased for matching ('' when absent).
 * Two drifted copies of this lived in gm.ts and sheet.ts (audit D4).
 */
export function typedOptionValue(
  interaction: APIApplicationCommandInteraction,
  name: string
): string {
  return (
    basicOptions(interaction)
      .find(o => o.name === name)
      ?.value?.toString()
      .toLowerCase() ?? ''
  );
}
