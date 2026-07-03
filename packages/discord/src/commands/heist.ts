// /heist — the admin/meta group: `about` (identity, privacy, deployed SHA — the CI/CD deploy
// probe) and `account` (is this Discord user linked, and which character is active). Campaign
// links arrive in Phase 2.
import { resolveActor } from '../authz';
import { copy } from '../format/copy';
import { deferred, inline, reply, replyEmbed } from '../respond';
import { subcommandName } from '../options';
import type { CommandHandler } from '../types';
import { discordUserId } from './character';

export const handleHeist: CommandHandler = (ctx, interaction) => {
  const sub = subcommandName(interaction);

  if (sub === 'about') {
    return inline(
      replyEmbed(
        {
          title: copy.aboutTitle,
          description: copy.aboutBody(ctx.siteUrl, ctx.deploySha),
        },
        { ephemeral: true }
      )
    );
  }

  if (sub === 'account') {
    const userId = discordUserId(interaction);
    if (!userId) return inline(reply(copy.unknownCommand, { ephemeral: true }));
    return deferred(
      async followUp => {
        if (!ctx.repos) return followUp.editOriginal({ content: copy.notConfigured });
        const actor = await resolveActor(ctx.repos, userId);
        if (!actor) return followUp.editOriginal({ content: copy.signInFirst(ctx.siteUrl) });
        const pointer = await ctx.repos.discordPlayers.getActiveCharacterId(actor.id);
        const activeId = pointer.success ? pointer.data : null;
        let activeName: string | null = null;
        if (activeId) {
          const character = await ctx.repos.characters.findById(activeId);
          if (character.success && character.data && character.data.createdBy === actor.id) {
            activeName = character.data.name;
          }
        }
        return followUp.editOriginal({
          content: copy.accountStatus(actor.username ?? actor.displayName ?? 'you', activeName),
        });
      },
      { ephemeral: true }
    );
  }

  return inline(reply(copy.unknownCommand, { ephemeral: true }));
};
