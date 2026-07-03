// /character behavior spec: the authz prelude (unlinked → sign-in copy; public-defer failures
// go delete+ephemeral), the one-active-character upsert, the stale-pointer ownership re-check,
// and autocomplete staying inside its no-defer budget. Repos are vi.fn() object literals — the
// same pattern as the engine spec.
import type {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandInteraction,
} from 'discord-api-types/v10';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseRepositories } from '@heist-mind/database';
import { clearActorCache } from '../authz';
import type { BotContext, FollowUpClient, HandlerResult } from '../types';
import { characterAutocomplete, handleCharacter } from './character';

afterEach(() => clearActorCache());

const ok = <T,>(data: T) => ({ success: true as const, data });

const PROFILE = { id: 'p1', username: 'silks' };
const CHARACTERS = [
  { id: 'c1', name: 'Silks', createdBy: 'p1' },
  { id: 'c2', name: 'Marrow', createdBy: 'p1' },
];

function repos(overrides: Record<string, unknown> = {}): DatabaseRepositories {
  return {
    profiles: { findByDiscordId: vi.fn().mockResolvedValue(ok(PROFILE)) },
    characters: { findByPlayer: vi.fn().mockResolvedValue(ok(CHARACTERS)) },
    discordPlayers: {
      setActiveCharacter: vi.fn().mockResolvedValue(ok(undefined)),
      clearActiveCharacter: vi.fn().mockResolvedValue(ok(undefined)),
      getActiveCharacterId: vi.fn().mockResolvedValue(ok('c1')),
    },
    ...overrides,
  } as unknown as DatabaseRepositories;
}

const ctx = (r: DatabaseRepositories | null): BotContext => ({
  realize: () => [],
  deploySha: 'test',
  siteUrl: 'https://heistmind.example',
  repos: r,
});

function cmd(sub: string, options: unknown[] = []): APIApplicationCommandInteraction {
  return {
    type: 2,
    user: { id: 'discord-1' },
    data: { name: 'character', type: 1, options: [{ name: sub, type: 1, options }] },
  } as unknown as APIApplicationCommandInteraction;
}

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

describe('/character use', () => {
  it('defers ephemerally, matches by name case-insensitively, and points the upsert', async () => {
    const r = repos();
    const result = await handleCharacter(ctx(r), cmd('use', [{ name: 'name', type: 3, value: 'silks' }]));
    expect(result.response.type).toBe(5);
    expect((result.response as { data?: { flags?: number } }).data?.flags).toBe(64); // ephemeral defer
    const calls = await run(result);
    expect(r.discordPlayers.setActiveCharacter).toHaveBeenCalledWith('p1', 'c1');
    expect(calls[0]).toEqual({
      method: 'edit',
      payload: { content: expect.stringContaining('Silks') },
    });
  });

  it('an unlinked Discord user gets the sign-in copy', async () => {
    const r = repos({ profiles: { findByDiscordId: vi.fn().mockResolvedValue(ok(null)) } });
    const calls = await run(await handleCharacter(ctx(r), cmd('use', [{ name: 'name', type: 3, value: 'Silks' }])));
    expect(calls[0]?.method).toBe('edit');
    expect(JSON.stringify(calls[0]?.payload)).toContain('heistmind.example');
  });

  it('a name that is not yours suggests the autocomplete, leaking nothing', async () => {
    const calls = await run(
      await handleCharacter(ctx(repos()), cmd('use', [{ name: 'name', type: 3, value: 'SomeoneElse' }]))
    );
    expect(JSON.stringify(calls[0]?.payload)).toContain('SomeoneElse');
  });

  it('missing repos phrases "not configured"', async () => {
    const calls = await run(await handleCharacter(ctx(null), cmd('use', [{ name: 'name', type: 3, value: 'x' }])));
    expect(JSON.stringify(calls[0]?.payload)).toContain('not configured');
  });
});

describe('/character show', () => {
  const DETAILS = {
    id: 'c1',
    name: 'Silks',
    createdBy: 'p1',
    game: null,
    ruleset: { content: { playbooks: [{ id: 'cutter', name: 'Cutter' }], attributes: [], characterCreation: { steps: [] } } },
    characterData: { playbook: 'cutter', stress: 3, trauma: [], attributes: {}, skills: {}, specialAbilities: [], contacts: [], custom: {}, coins: 2, stash: 5 },
  };

  it('renders the active sheet ephemerally by default', async () => {
    const r = repos({
      characters: {
        findByPlayer: vi.fn().mockResolvedValue(ok(CHARACTERS)),
        findWithDetails: vi.fn().mockResolvedValue(ok(DETAILS)),
      },
    });
    const result = await handleCharacter(ctx(r), cmd('show'));
    expect((result.response as { data?: { flags?: number } }).data?.flags).toBe(64);
    const calls = await run(result);
    const embeds = (calls[0]?.payload as { embeds: { title: string }[] }).embeds;
    expect(embeds[0]?.title).toBe('Silks');
  });

  it('share:true defers PUBLICLY; a stale pointer to someone else’s character fails delete+ephemeral', async () => {
    const stolen = { ...DETAILS, createdBy: 'OTHER' };
    const r = repos({
      characters: {
        findByPlayer: vi.fn().mockResolvedValue(ok(CHARACTERS)),
        findWithDetails: vi.fn().mockResolvedValue(ok(stolen)),
      },
    });
    const result = await handleCharacter(ctx(r), cmd('show', [{ name: 'share', type: 5, value: true }]));
    expect((result.response as { data?: { flags?: number } }).data?.flags).toBeUndefined(); // public defer
    const calls = await run(result);
    expect(calls.map(c => c.method)).toEqual(['delete', 'ephemeral']);
  });
});

describe('/character unset', () => {
  it('clears the pointer', async () => {
    const r = repos();
    const calls = await run(await handleCharacter(ctx(r), cmd('unset')));
    expect(r.discordPlayers.clearActiveCharacter).toHaveBeenCalledWith('p1');
    expect(calls[0]?.method).toBe('edit');
  });
});

describe('characterAutocomplete', () => {
  const auto = (typed: string) =>
    ({
      type: 4,
      user: { id: 'discord-1' },
      data: {
        name: 'character',
        type: 1,
        options: [{ name: 'use', type: 1, options: [{ name: 'name', type: 3, value: typed, focused: true }] }],
      },
    }) as unknown as APIApplicationCommandAutocompleteInteraction;

  it('suggests the actor’s own characters filtered by the typed prefix', async () => {
    const choices = await characterAutocomplete(ctx(repos()), auto('mar'));
    expect(choices).toEqual([{ name: 'Marrow', value: 'Marrow' }]);
  });

  it('degrades to [] without repos or an actor', async () => {
    expect(await characterAutocomplete(ctx(null), auto('x'))).toEqual([]);
    const r = repos({ profiles: { findByDiscordId: vi.fn().mockResolvedValue(ok(null)) } });
    expect(await characterAutocomplete(ctx(r), auto('x'))).toEqual([]);
  });

  it('caches the actor lookup (one profile query across calls)', async () => {
    const findByDiscordId = vi.fn().mockResolvedValue(ok(PROFILE));
    const r = repos({ profiles: { findByDiscordId } });
    await characterAutocomplete(ctx(r), auto('s'));
    await characterAutocomplete(ctx(r), auto('si'));
    expect(findByDiscordId).toHaveBeenCalledTimes(1);
  });
});
