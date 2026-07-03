// /heist — the admin/meta group. Phase 0 ships `about` (identity, privacy, and the deployed
// SHA — the CI/CD deploy probe); link/account/status arrive in later phases.
import { copy } from '../format/copy';
import { reply, replyEmbed } from '../respond';
import { subcommandName } from '../options';
import type { CommandHandler } from '../types';

export const handleHeist: CommandHandler = (ctx, interaction) => {
  const sub = subcommandName(interaction);
  if (sub === 'about') {
    return replyEmbed(
      {
        title: copy.aboutTitle,
        description: copy.aboutBody(ctx.siteUrl, ctx.deploySha),
      },
      { ephemeral: true }
    );
  }
  return reply(copy.unknownCommand, { ephemeral: true });
};
