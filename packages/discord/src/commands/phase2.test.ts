// Phase-2 behavior spec: link scopes + GM gating, the non-member wall (leaking nothing), /log
// attribution + auto score-tagging via the repo, and the guild-only guard.
import type {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandInteraction,
} from 'discord-api-types/v10';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseRepositories } from '@heist-mind/database';
import { clearActorCache } from '../authz';
import type { BotContext, FollowUpClient, HandlerResult } from '../types';
import { handleHeist, heistAutocomplete } from './heist';
import { handleLog } from './log';

afterEach(() => clearActorCache());

const ok = <T,>(data: T) => ({ success: true as const, data });
const fail = (message: string, code?: string) => ({
  success: false as const,
  error: { message, ...(code ? { code } : {}) },
});

const GAME = { id: 'g1', name: 'The Docks Job', state: 'active', discordGuildId: 'guild-1', discordChannelId: 'chan-1' };

function repos(overrides: Record<string, unknown> = {}): DatabaseRepositories {
  return {
    profiles: { findByDiscordId: vi.fn().mockResolvedValue(ok({ id: 'p1', username: 'gm' })) },
    games: {
      findByCreator: vi.fn().mockResolvedValue(ok([GAME])),
      findByDiscordChannel: vi.fn().mockResolvedValue(ok(GAME)),
      setDiscordLink: vi.fn().mockResolvedValue(ok(GAME)),
    },
    gamePlayers: {
      isGameMaster: vi.fn().mockResolvedValue(ok(true)),
      findByGame: vi.fn().mockResolvedValue(ok([{ playerId: 'p1', status: 'active' }])),
    },
    rolls: { create: vi.fn().mockResolvedValue(ok({ id: 'r1' })) },
    scores: { findActive: vi.fn().mockResolvedValue(ok({ name: 'The Vault' })) },
    crews: { findByGame: vi.fn().mockResolvedValue(ok({ tier: 1, heat: 3, wanted: 1 })) },
    clocks: { findByGame: vi.fn().mockResolvedValue(ok([{ name: 'Alarm', filled: 2, segments: 4 }])) },
    characters: { findByGame: vi.fn().mockResolvedValue(ok([{ id: 'c1', name: 'Silks', createdBy: 'p1' }])) },
    ...overrides,
  } as unknown as DatabaseRepositories;
}

const ctx = (r: DatabaseRepositories | null): BotContext => ({
  realize: () => [],
  deploySha: 'test',
  siteUrl: 'https://heistmind.example',
  repos: r,
});

type Option = { name: string; type: number; value?: unknown; options?: Option[] };
const guildCmd = (name: string, sub: string | null, options: Option[] = []): APIApplicationCommandInteraction =>
  ({
    type: 2,
    guild_id: 'guild-1',
    channel: { id: 'chan-1', parent_id: 'cat-1' },
    member: { user: { id: 'discord-1' } },
    data: {
      name,
      type: 1,
      options: sub ? [{ name: sub, type: 1, options }] : options,
    },
  }) as unknown as APIApplicationCommandInteraction;

function captureFollowUp() {
  const calls: { method: string; payload?: unknown }[] = [];
  const client: FollowUpClient = {
    editOriginal: payload => (calls.push({ method: 'edit', payload }), Promise.resolve()),
    deleteOriginal: () => (calls.push({ method: 'delete' }), Promise.resolve()),
    sendEphemeral: content => (calls.push({ method: 'ephemeral', payload: content }), Promise.resolve()),
  };
  return { client, calls };
}

async function run(result: HandlerResult) {
  const { client, calls } = captureFollowUp();
  if (!result.work) throw new Error('expected deferred work');
  await result.work(client);
  return calls;
}

describe('/heist link', () => {
  it('links the CHANNEL by default, logs a feed note, and confirms publicly', async () => {
    const r = repos();
    const calls = await run(
      await handleHeist(ctx(r), guildCmd('heist', 'link', [{ name: 'campaign', type: 3, value: 'the docks job' }]))
    );
    expect(r.games.setDiscordLink).toHaveBeenCalledWith('g1', { guildId: 'guild-1', channelId: 'chan-1' });
    expect(r.rolls.create).toHaveBeenCalledWith('p1', expect.objectContaining({ kind: 'note' }));
    expect(calls[0]?.method).toBe('edit');
  });

  it('scope:category links the parent; scope:server links guild-wide', async () => {
    const r = repos();
    await run(
      await handleHeist(
        ctx(r),
        guildCmd('heist', 'link', [
          { name: 'campaign', type: 3, value: 'The Docks Job' },
          { name: 'scope', type: 3, value: 'category' },
        ])
      )
    );
    expect(r.games.setDiscordLink).toHaveBeenCalledWith('g1', { guildId: 'guild-1', channelId: 'cat-1' });
    await run(
      await handleHeist(
        ctx(r),
        guildCmd('heist', 'link', [
          { name: 'campaign', type: 3, value: 'The Docks Job' },
          { name: 'scope', type: 3, value: 'server' },
        ])
      )
    );
    expect(r.games.setDiscordLink).toHaveBeenLastCalledWith('g1', { guildId: 'guild-1', channelId: null });
  });

  it('non-GM gets an ephemeral refusal; an already-linked surface phrases the conflict', async () => {
    const notGm = repos({ gamePlayers: { isGameMaster: vi.fn().mockResolvedValue(ok(false)) } });
    const calls = await run(
      await handleHeist(ctx(notGm), guildCmd('heist', 'link', [{ name: 'campaign', type: 3, value: 'The Docks Job' }]))
    );
    expect(calls.map(c => c.method)).toEqual(['delete', 'ephemeral']);

    const dup = repos({
      games: {
        findByCreator: vi.fn().mockResolvedValue(ok([GAME])),
        setDiscordLink: vi.fn().mockResolvedValue(fail('duplicate key value', '23505')),
      },
    });
    const dupCalls = await run(
      await handleHeist(ctx(dup), guildCmd('heist', 'link', [{ name: 'campaign', type: 3, value: 'The Docks Job' }]))
    );
    expect(String(dupCalls[1]?.payload)).toContain('already linked');
  });

  it('outside a guild, link commands answer the guild-only hint inline', async () => {
    const dm = {
      type: 2,
      user: { id: 'discord-1' },
      data: { name: 'heist', type: 1, options: [{ name: 'link', type: 1, options: [] }] },
    } as unknown as APIApplicationCommandInteraction;
    const result = await handleHeist(ctx(repos()), dm);
    expect(result.work).toBeUndefined();
    expect((result.response as { data?: { flags?: number } }).data?.flags).toBe(64);
  });
});

describe('/heist unlink', () => {
  it('clears the link, logs the feed note, and confirms publicly', async () => {
    const r = repos();
    const calls = await run(await handleHeist(ctx(r), guildCmd('heist', 'unlink')));
    expect(r.games.setDiscordLink).toHaveBeenCalledWith('g1', null);
    expect(r.rolls.create).toHaveBeenCalledWith('p1', expect.objectContaining({ kind: 'note' }));
    expect(String((calls[0]?.payload as { content: string }).content)).toContain('no longer linked');
  });

  it('nothing linked → the not-linked hint', async () => {
    const r = repos({ games: { findByDiscordChannel: vi.fn().mockResolvedValue(ok(null)) } });
    const calls = await run(await handleHeist(ctx(r), guildCmd('heist', 'unlink')));
    expect(String(calls[1]?.payload)).toContain('Nothing is linked');
  });
});

describe('/heist status', () => {
  it('renders the member snapshot (score, crew line, running clocks)', async () => {
    const calls = await run(await handleHeist(ctx(repos()), guildCmd('heist', 'status')));
    const embed = (calls[0]?.payload as { embeds: { title: string; fields: { value: string }[] }[] }).embeds[0];
    expect(embed?.title).toContain('The Docks Job');
    expect(JSON.stringify(embed)).toContain('The Vault');
    expect(JSON.stringify(embed)).toContain('Alarm 2/4');
  });

  it('a fresh campaign renders every fallback line (no score/crew/clocks)', async () => {
    const r = repos({
      scores: { findActive: vi.fn().mockResolvedValue(ok(null)) },
      crews: { findByGame: vi.fn().mockResolvedValue(ok(null)) },
      clocks: { findByGame: vi.fn().mockResolvedValue(ok([])) },
    });
    const calls = await run(await handleHeist(ctx(r), guildCmd('heist', 'status')));
    const json = JSON.stringify(calls[0]?.payload);
    expect(json).toContain('Between scores');
    expect(json).toContain('No crew sheet yet');
  });

  it('a non-member is refused without the campaign name', async () => {
    const r = repos({
      gamePlayers: {
        isGameMaster: vi.fn().mockResolvedValue(ok(false)),
        findByGame: vi.fn().mockResolvedValue(ok([])),
      },
    });
    const calls = await run(await handleHeist(ctx(r), guildCmd('heist', 'status')));
    expect(calls.map(c => c.method)).toEqual(['delete', 'ephemeral']);
    expect(String(calls[1]?.payload)).not.toContain('Docks');
  });
});

describe('/log', () => {
  it('records an attributed note against the member’s campaign character', async () => {
    const r = repos();
    const calls = await run(
      await handleLog(ctx(r), guildCmd('log', null, [{ name: 'text', type: 3, value: 'Took 2 stress crossing the wire' }]))
    );
    expect(r.rolls.create).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({
        gameId: 'g1',
        characterId: 'c1',
        kind: 'note',
        label: 'Silks',
        note: 'Took 2 stress crossing the wire',
      })
    );
    expect(calls[0]?.method).toBe('edit');
  });

  it('an unlinked channel phrases the not-linked hint', async () => {
    const r = repos({
      games: { findByDiscordChannel: vi.fn().mockResolvedValue(ok(null)) },
    });
    const calls = await run(
      await handleLog(ctx(r), guildCmd('log', null, [{ name: 'text', type: 3, value: 'x' }]))
    );
    expect(String(calls[1]?.payload)).toContain('Nothing is linked');
  });
});

describe('heistAutocomplete', () => {
  it('suggests the actor’s campaigns for link', async () => {
    const auto = {
      type: 4,
      guild_id: 'guild-1',
      member: { user: { id: 'discord-1' } },
      data: {
        name: 'heist',
        type: 1,
        options: [{ name: 'link', type: 1, options: [{ name: 'campaign', type: 3, value: 'dock', focused: true }] }],
      },
    } as unknown as APIApplicationCommandAutocompleteInteraction;
    expect(await heistAutocomplete(ctx(repos()), auto)).toEqual([
      { name: 'The Docks Job', value: 'The Docks Job' },
    ]);
  });
});
