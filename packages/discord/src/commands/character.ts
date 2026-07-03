// /character — the account-backed active-character commands (Phase 1): `use` points the bot at
// one of YOUR characters (one at a time — structural via discord_players' PK), `show` renders
// the active sheet, `unset` clears the pointer. All ephemeral by default (account admin), with
// `show share:true` posting publicly. Every path defers before DB I/O, runs the authz prelude,
// and phrases failures without leaking other players' data.
import type {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandInteraction,
  APIApplicationCommandOptionChoice,
} from 'discord-api-types/v10';
import type { Character } from '@heist-mind/core';
import { resolveActor } from '../authz';
import { copy } from '../format/copy';
import { characterSheetEmbed } from '../format/embeds';
import { basicOptions, booleanOption, stringOption, subcommandName } from '../options';
import { deferred, inline, reply } from '../respond';
import type { BotContext, CommandHandler } from '../types';

/** The invoking Discord user id (guild interactions carry `member`, DMs carry `user`). */
export function discordUserId(
  interaction: Pick<APIApplicationCommandInteraction, 'member' | 'user'>
): string | null {
  return interaction.member?.user.id ?? interaction.user?.id ?? null;
}

export const handleCharacter: CommandHandler = (ctx, interaction) => {
  const sub = subcommandName(interaction);
  const userId = discordUserId(interaction);
  if (!userId) return inline(reply(copy.unknownCommand, { ephemeral: true }));

  // `show share:true` is the one public path; its flag is FINAL at defer time.
  const share = sub === 'show' && booleanOption(interaction, 'share') === true;

  return deferred(
    async followUp => {
      // A publicly-deferred reply that fails the prelude must not stay public.
      const failEphemeral = async (content: string): Promise<void> => {
        if (share) {
          await followUp.deleteOriginal();
          await followUp.sendEphemeral(content);
        } else {
          await followUp.editOriginal({ content });
        }
      };

      if (!ctx.repos) return failEphemeral(copy.notConfigured);
      const actor = await resolveActor(ctx.repos, userId);
      if (!actor) return failEphemeral(copy.signInFirst(ctx.siteUrl));

      if (sub === 'use') {
        const name = stringOption(interaction, 'name')?.trim() ?? '';
        const mine = await ctx.repos.characters.findByPlayer(actor.id);
        if (!mine.success) return failEphemeral(copy.somethingBroke);
        // Ownership is implicit: the candidate set IS the actor's own characters.
        const match = mine.data.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (!match) return failEphemeral(copy.characterNotFound(name, mine.data.length));
        const set = await ctx.repos.discordPlayers.setActiveCharacter(actor.id, match.id);
        if (!set.success) return failEphemeral(copy.somethingBroke);
        return followUp.editOriginal({ content: copy.characterInUse(match.name) });
      }

      if (sub === 'unset') {
        const cleared = await ctx.repos.discordPlayers.clearActiveCharacter(actor.id);
        if (!cleared.success) return failEphemeral(copy.somethingBroke);
        return followUp.editOriginal({ content: copy.characterUnset });
      }

      if (sub === 'show') {
        const activeId = await ctx.repos.discordPlayers.getActiveCharacterId(actor.id);
        if (!activeId.success) return failEphemeral(copy.somethingBroke);
        if (!activeId.data) return failEphemeral(copy.noActiveCharacter);
        const details = await ctx.repos.characters.findWithDetails(activeId.data);
        if (!details.success || !details.data) return failEphemeral(copy.noActiveCharacter);
        // Re-assert ownership: the pointer could be stale after a character transfer.
        if (details.data.createdBy !== actor.id) return failEphemeral(copy.noActiveCharacter);
        return followUp.editOriginal({ embeds: [characterSheetEmbed(details.data)] });
      }

      return failEphemeral(copy.unknownCommand);
    },
    { ephemeral: !share }
  );
};

/** Suggest the actor's own characters for `use name:` — ≤2 indexed queries, [] on any trouble. */
export async function characterAutocomplete(
  ctx: BotContext,
  interaction: APIApplicationCommandAutocompleteInteraction
): Promise<APIApplicationCommandOptionChoice[]> {
  try {
    const userId = discordUserId(interaction);
    if (!ctx.repos || !userId) return [];
    const actor = await resolveActor(ctx.repos, userId);
    if (!actor) return [];
    const mine = await ctx.repos.characters.findByPlayer(actor.id);
    if (!mine.success) return [];
    const typed =
      basicOptions(interaction as unknown as APIApplicationCommandInteraction)
        .find(o => o.name === 'name')
        ?.value?.toString()
        .toLowerCase() ?? '';
    return mine.data
      .filter((c: Character) => c.name.toLowerCase().includes(typed))
      .slice(0, 25)
      .map((c: Character) => ({ name: c.name, value: c.name }));
  } catch {
    return [];
  }
}
