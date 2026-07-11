// Link resolution (bot phase 2 + F66): the payload answers channel links, category links, and
// thread→parent-channel links with no fetch; the ONE payload-blind case — a THREAD whose parent
// channel is only covered by a CATEGORY link — retries through the optional bot-token
// channel-parent fetcher. No fetcher / no match → behaves exactly as before.
import { describe, expect, it, vi } from 'vitest';
import type { Game } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { linkCandidates, resolveLinkedGame } from './links';

const GAME = { id: 'g1', name: 'The Docks Job' } as unknown as Game;
const ok = <T>(data: T) => ({ success: true as const, data });

/** A repos stub whose findByDiscordChannel resolves per-candidate-list via the given map. */
function reposResolving(byCandidates: (candidates: string[]) => Game | null) {
  const findByDiscordChannel = vi.fn((_guild: string, candidates: string[]) =>
    Promise.resolve(ok(byCandidates(candidates)))
  );
  return {
    repos: { games: { findByDiscordChannel } } as unknown as DatabaseRepositories,
    findByDiscordChannel,
  };
}

// A public thread (type 11) inside channel chan-1, which sits under category cat-1.
const THREAD_INTERACTION = {
  guild_id: 'guild-1',
  channel: { id: 'thread-1', parent_id: 'chan-1', type: 11 },
} as never;

describe('linkCandidates', () => {
  it('collects channel + parent in precedence order; DMs are not linkable', () => {
    expect(linkCandidates(THREAD_INTERACTION)).toEqual({
      guildId: 'guild-1',
      candidates: ['thread-1', 'chan-1'],
    });
    expect(linkCandidates({ channel: { id: 'dm-1' } } as never)).toBeNull();
  });
});

describe('resolveLinkedGame — F66 thread-under-category retry', () => {
  it('resolves a thread whose parent channel is only CATEGORY-linked via one parent fetch', async () => {
    // Payload candidates miss; only the category id resolves.
    const { repos, findByDiscordChannel } = reposResolving(candidates =>
      candidates.includes('cat-1') ? GAME : null
    );
    const fetchChannelParent = vi.fn().mockResolvedValue('cat-1');

    const game = await resolveLinkedGame(repos, THREAD_INTERACTION, fetchChannelParent);
    expect(game).toEqual(GAME);
    // The fetch asked for the PARENT CHANNEL's category, and the retry looked it up.
    expect(fetchChannelParent).toHaveBeenCalledWith('chan-1');
    expect(findByDiscordChannel).toHaveBeenLastCalledWith('guild-1', ['cat-1']);
  });

  it('never fetches when the payload already resolves (channel or parent link)', async () => {
    const { repos } = reposResolving(candidates => (candidates.includes('chan-1') ? GAME : null));
    const fetchChannelParent = vi.fn();
    const game = await resolveLinkedGame(repos, THREAD_INTERACTION, fetchChannelParent);
    expect(game).toEqual(GAME);
    expect(fetchChannelParent).not.toHaveBeenCalled();
  });

  it('never fetches for a NON-thread channel (its parent_id already IS the category)', async () => {
    const { repos } = reposResolving(() => null);
    const fetchChannelParent = vi.fn();
    const plainChannel = {
      guild_id: 'guild-1',
      channel: { id: 'chan-1', parent_id: 'cat-1', type: 0 },
    } as never;
    expect(await resolveLinkedGame(repos, plainChannel, fetchChannelParent)).toBeNull();
    expect(fetchChannelParent).not.toHaveBeenCalled();
  });

  it('degrades to "not linked" with no fetcher, a failed fetch, or a fetched miss', async () => {
    const { repos } = reposResolving(() => null);
    // No fetcher (no bot token configured).
    expect(await resolveLinkedGame(repos, THREAD_INTERACTION)).toBeNull();
    // Fetch resolves nothing (no category / API trouble).
    expect(
      await resolveLinkedGame(repos, THREAD_INTERACTION, vi.fn().mockResolvedValue(null))
    ).toBeNull();
    // Fetched category has no link either.
    expect(
      await resolveLinkedGame(repos, THREAD_INTERACTION, vi.fn().mockResolvedValue('cat-9'))
    ).toBeNull();
  });
});
