// /log — BRD R-H2.2, the settled-result recorder: a member posts what happened (rolled IRL,
// narrated, whatever) and it lands in the linked campaign's log as a `note` event — attributed
// via the actor, tagged to their character in that campaign when they have one, and auto-tagged
// with the active score by the roll repository. Public (that IS the play-by-post feed).
import { isMember, resolveActor } from '../authz';
import { copy } from '../format/copy';
import { linkCandidates, resolveLinkedGame } from '../links';
import { deferred, failEphemeral, inline, reply } from '../respond';
import { stringOption } from '../options';
import type { CommandHandler } from '../types';
import { discordUserId } from './character';

export const handleLog: CommandHandler = (ctx, interaction) => {
  const userId = discordUserId(interaction);
  const surface = linkCandidates(interaction);
  if (!userId || !surface) return inline(reply(copy.guildOnly, { ephemeral: true }));
  const text = stringOption(interaction, 'text')?.trim() ?? '';

  return deferred(async followUp => {
    if (!ctx.repos) return failEphemeral(followUp, copy.notConfigured);
    const repos = ctx.repos;
    const actor = await resolveActor(repos, userId);
    if (!actor) return failEphemeral(followUp, copy.signInFirst(ctx.siteUrl));
    const game = await resolveLinkedGame(repos, interaction);
    if (!game) return failEphemeral(followUp, copy.notLinked);
    if (!(await isMember(repos, actor.id, game.id))) return failEphemeral(followUp, copy.notMember);

    // Attribute to the actor's character in THIS campaign when they have one.
    const roster = await repos.characters.findByGame(game.id);
    const character = roster.success
      ? (roster.data.find(c => c.createdBy === actor.id) ?? null)
      : null;

    const created = await repos.rolls.create(actor.id, {
      gameId: game.id,
      ...(character ? { characterId: character.id } : {}),
      kind: 'note',
      label: character?.name ?? actor.username ?? actor.displayName ?? 'Discord',
      dice: 0,
      results: [],
      note: text,
    });
    if (!created.success) return failEphemeral(followUp, copy.somethingBroke);
    return followUp.editOriginal({ content: copy.logRecorded(text) });
  });
};
