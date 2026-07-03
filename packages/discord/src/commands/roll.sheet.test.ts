// The sheet-aware /roll (Phase 1): active-character rating resolution, push/extra pool math,
// public-defer with delete+ephemeral failures, and the action autocomplete with ratings.
import type {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandInteraction,
} from 'discord-api-types/v10';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseRepositories } from '@heist-mind/database';
import { clearActorCache } from '../authz';
import type { BotContext, FollowUpClient, HandlerResult } from '../types';
import { handleRoll, rollAutocomplete } from './roll';

afterEach(() => clearActorCache());

const ok = <T,>(data: T) => ({ success: true as const, data });

const DETAILS = {
  id: 'c1',
  name: 'Silks',
  createdBy: 'p1',
  game: null,
  ruleset: {
    content: {
      playbooks: [],
      attributes: [],
      characterCreation: { steps: [] },
      skills: [
        { id: 'skirmish', name: 'Skirmish', description: '', attribute: 'prowess' },
        { id: 'prowl', name: 'Prowl', description: '', attribute: 'prowess' },
      ],
    },
  },
  characterData: { playbook: 'cutter', skills: { skirmish: 2 }, attributes: {}, specialAbilities: [], stress: 0, trauma: [], contacts: [], custom: {} },
};

function repos(): DatabaseRepositories {
  return {
    profiles: { findByDiscordId: vi.fn().mockResolvedValue(ok({ id: 'p1', username: 'silks' })) },
    discordPlayers: { getActiveCharacterId: vi.fn().mockResolvedValue(ok('c1')) },
    characters: { findWithDetails: vi.fn().mockResolvedValue(ok(DETAILS)) },
  } as unknown as DatabaseRepositories;
}

const ctx = (r: DatabaseRepositories | null, faces: number[]): BotContext => ({
  realize: count => faces.slice(0, count),
  deploySha: 'test',
  siteUrl: 'https://heistmind.example',
  repos: r,
});

type Option = { name: string; type: number; value?: unknown };
const cmd = (options: Option[]): APIApplicationCommandInteraction =>
  ({
    type: 2,
    user: { id: 'discord-1' },
    data: { name: 'roll', type: 1, options },
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

describe('/roll action (sheet form)', () => {
  it('defers PUBLICLY and rolls rating + extra + push with the reminder note', async () => {
    const result = await handleRoll(
      ctx(repos(), [6, 5, 4, 3]),
      cmd([
        { name: 'action', type: 3, value: 'skirmish' },
        { name: 'extra', type: 4, value: 1 },
        { name: 'push', type: 5, value: true },
      ])
    );
    expect(result.response.type).toBe(5);
    expect((result.response as { data?: { flags?: number } }).data?.flags).toBeUndefined();
    const calls = await run(result);
    const embed = (calls[0]?.payload as { embeds: { title: string; description: string }[] }).embeds[0];
    // rating 2 + extra 1 + push 1 = 4d
    expect(embed?.title).toBe('Silks — Skirmish 2d +2d');
    expect(embed?.description).toContain('[6, 5, 4, 3]');
    expect(embed?.description).toContain('mark 2 stress');
  });

  it('no active character → delete + ephemeral sign-in/use copy', async () => {
    const r = repos();
    (r.discordPlayers.getActiveCharacterId as ReturnType<typeof vi.fn>).mockResolvedValue(ok(null));
    const calls = await run(await handleRoll(ctx(r, []), cmd([{ name: 'action', type: 3, value: 'Skirmish' }])));
    expect(calls.map(c => c.method)).toEqual(['delete', 'ephemeral']);
  });

  it('an action missing from the ruleset fails with the autocomplete hint', async () => {
    const calls = await run(
      await handleRoll(ctx(repos(), []), cmd([{ name: 'action', type: 3, value: 'Fly' }]))
    );
    expect(calls.map(c => c.method)).toEqual(['delete', 'ephemeral']);
    expect(String(calls[1]?.payload)).toContain('Fly');
  });

  it('neither dice nor action → ephemeral usage hint (inline)', async () => {
    const result = await handleRoll(ctx(null, []), cmd([]));
    expect(result.work).toBeUndefined();
    expect((result.response as { data?: { flags?: number } }).data?.flags).toBe(64);
  });

  it('an UNRATED action rolls the zero-dice rule', async () => {
    const result = await handleRoll(ctx(repos(), [6, 6]), cmd([{ name: 'action', type: 3, value: 'Prowl' }]));
    const calls = await run(result);
    const embed = (calls[0]?.payload as { embeds: { title: string; fields?: { value: string }[] }[] }).embeds[0];
    expect(embed?.title).toBe('Silks — Prowl 0d');
    // two sixes on 0d take-lowest is a plain success, never a crit.
    expect(embed?.fields?.[0]?.value).toBe('Full success');
  });
});

describe('rollAutocomplete', () => {
  const auto = (typed: string) =>
    ({
      type: 4,
      user: { id: 'discord-1' },
      data: {
        name: 'roll',
        type: 1,
        options: [{ name: 'action', type: 3, value: typed, focused: true }],
      },
    }) as unknown as APIApplicationCommandAutocompleteInteraction;

  it('suggests the active character’s actions labeled with their ratings', async () => {
    const choices = await rollAutocomplete(ctx(repos(), []), auto('sk'));
    expect(choices).toEqual([{ name: 'Skirmish (2d)', value: 'Skirmish' }]);
  });

  it('degrades to [] with no repos or no active character', async () => {
    expect(await rollAutocomplete(ctx(null, []), auto(''))).toEqual([]);
  });
});
