// /heist — the admin/meta group: `about` (deploy probe), `account` (link status), and the
// Phase-2 campaign-link surface: `link` (GM, channel/category/server scope), `unlink` (GM), and
// `status` (member snapshot). Link state is table-visible, so successes post publicly; every
// failure is ephemeral and leaks nothing to non-members.
import { isGM, isMember, resolveActor } from '../authz';
import { copy } from '../format/copy';
import { campaignStatusEmbed } from '../format/embeds';
import { linkCandidates, resolveLinkedGame } from '../links';
import { deferred, failEphemeral, inline, reply, replyEmbed } from '../respond';
import { stringOption, subcommandName } from '../options';
import type {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandOptionChoice,
} from 'discord-api-types/v10';
import type { BotContext, CommandHandler } from '../types';
import { discordUserId } from './character';

type LinkScope = 'channel' | 'category' | 'server';

export const handleHeist: CommandHandler = (ctx, interaction) => {
  const sub = subcommandName(interaction);

  if (sub === 'about') {
    return inline(
      replyEmbed(
        { title: copy.aboutTitle, description: copy.aboutBody(ctx.siteUrl, ctx.deploySha) },
        { ephemeral: true }
      )
    );
  }

  if (sub === 'help') {
    return inline(
      replyEmbed({ title: copy.helpTitle, description: copy.helpBody(ctx.siteUrl) }, { ephemeral: true })
    );
  }

  const userId = discordUserId(interaction);
  if (!userId) return inline(reply(copy.unknownCommand, { ephemeral: true }));

  if (sub === 'account') {
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

  // Everything below acts on a guild surface.
  const surface = linkCandidates(interaction);
  if (!surface) return inline(reply(copy.guildOnly, { ephemeral: true }));

  // Link state is table-visible → public defer; failures go delete + ephemeral.
  return deferred(async followUp => {
    if (!ctx.repos) return failEphemeral(followUp, copy.notConfigured);
    const repos = ctx.repos;
    const actor = await resolveActor(repos, userId);
    if (!actor) return failEphemeral(followUp, copy.signInFirst(ctx.siteUrl));

    if (sub === 'link') {
      const campaignName = stringOption(interaction, 'campaign')?.trim() ?? '';
      const scope = (stringOption(interaction, 'scope') ?? 'channel') as LinkScope;
      const mine = await repos.games.findByCreator(actor.id);
      if (!mine.success) return failEphemeral(followUp, copy.somethingBroke);
      const game = mine.data.find(g => g.name.toLowerCase() === campaignName.toLowerCase());
      if (!game) return failEphemeral(followUp, copy.campaignNotFound(campaignName));
      if (!(await isGM(repos, actor.id, game.id))) return failEphemeral(followUp, copy.gmOnly);

      const channel = interaction.channel as { id?: string; parent_id?: string | null };
      const channelId =
        scope === 'channel'
          ? (channel.id ?? null)
          : scope === 'category'
            ? (channel.parent_id ?? null)
            : null;
      if (scope === 'category' && !channelId) return failEphemeral(followUp, copy.noCategoryHere);

      const linked = await repos.games.setDiscordLink(game.id, {
        guildId: surface.guildId,
        channelId,
      });
      if (!linked.success) {
        const duplicate =
          linked.error?.code === '23505' || /duplicate|unique/i.test(linked.error?.message ?? '');
        return failEphemeral(followUp, duplicate ? copy.alreadyLinked : copy.somethingBroke);
      }
      // The link itself is a campaign event — the in-app feed shows where play happens.
      await repos.rolls.create(actor.id, {
        gameId: game.id,
        kind: 'note',
        label: game.name,
        dice: 0,
        results: [],
        note: copy.linkFeedNote(scope),
      });
      return followUp.editOriginal({ content: copy.linked(game.name, scope) });
    }

    if (sub === 'unlink') {
      const game = await resolveLinkedGame(repos, interaction);
      if (!game) return failEphemeral(followUp, copy.notLinked);
      if (!(await isGM(repos, actor.id, game.id))) return failEphemeral(followUp, copy.gmOnly);
      const cleared = await repos.games.setDiscordLink(game.id, null);
      if (!cleared.success) return failEphemeral(followUp, copy.somethingBroke);
      await repos.rolls.create(actor.id, {
        gameId: game.id,
        kind: 'note',
        label: game.name,
        dice: 0,
        results: [],
        note: copy.unlinkFeedNote,
      });
      return followUp.editOriginal({ content: copy.unlinked(game.name) });
    }

    if (sub === 'status') {
      const game = await resolveLinkedGame(repos, interaction);
      if (!game) return failEphemeral(followUp, copy.notLinked);
      if (!(await isMember(repos, actor.id, game.id))) return failEphemeral(followUp, copy.notMember);
      const [score, crew, clocks] = await Promise.all([
        repos.scores.findActive(game.id),
        repos.crews.findByGame(game.id),
        repos.clocks.findByGame(game.id),
      ]);
      return followUp.editOriginal({
        embeds: [
          campaignStatusEmbed({
            game,
            activeScore: score.success ? score.data : null,
            crew: crew.success ? crew.data : null,
            clocks: clocks.success ? clocks.data : [],
          }),
        ],
      });
    }

    return failEphemeral(followUp, copy.unknownCommand);
  });
};

/** Suggest the actor's own (GM) campaigns for `/heist link campaign:`. */
export async function heistAutocomplete(
  ctx: BotContext,
  interaction: APIApplicationCommandAutocompleteInteraction
): Promise<APIApplicationCommandOptionChoice[]> {
  try {
    const userId = discordUserId(interaction);
    if (!ctx.repos || !userId) return [];
    const actor = await resolveActor(ctx.repos, userId);
    if (!actor) return [];
    const mine = await ctx.repos.games.findByCreator(actor.id);
    if (!mine.success) return [];
    const typed =
      (interaction.data.options?.[0] as { options?: { name: string; value?: unknown }[] })?.options
        ?.find(o => o.name === 'campaign')
        ?.value?.toString()
        .toLowerCase() ?? '';
    return mine.data
      .filter(g => g.name.toLowerCase().includes(typed))
      .slice(0, 25)
      .map(g => ({ name: g.name, value: g.name }));
  } catch {
    return [];
  }
}
