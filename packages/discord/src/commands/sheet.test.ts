// Phase-3 sheet-command spec: /stress /harm /vice /xp drive the REAL engine use-cases over
// mocked repos — pinning the call shapes, the RAW behaviors (escalation, overindulgence, the
// zero-dice vice pool), and the delete+ephemeral failure paths.
import type {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandInteraction,
  APIEmbed,
} from 'discord-api-types/v10';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseRepositories } from '@heist-mind/database';
import { clearActorCache } from '../authz';
import type { BotContext, FollowUpClient, HandlerResult } from '../types';
import {
  handleHarm,
  handleStress,
  handleVice,
  handleXp,
  harmAutocomplete,
  xpAutocomplete,
} from './sheet';

afterEach(() => clearActorCache());

const ok = <T,>(data: T) => ({ success: true as const, data });
const fail = (message: string) => ({ success: false as const, error: { message } });

const details = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  name: 'Silks',
  createdBy: 'p1',
  gameId: 'g1',
  game: null,
  experiencePoints: 4,
  ruleset: {
    content: {
      playbooks: [],
      attributes: [],
      characterCreation: { steps: [] },
      skills: [{ id: 'skirmish', name: 'Skirmish', description: '', attribute: 'prowess' }],
      specialAbilities: [{ id: 'battleborn', name: 'Battleborn', description: '' }],
      advancement: { advancementOptions: [{ id: 'a1', name: 'New ability', category: 'ability', cost: 2 }] },
    },
  },
  characterData: {
    playbook: 'cutter',
    skills: { skirmish: 2 },
    attributes: {},
    specialAbilities: [],
    stress: 4,
    trauma: [],
    contacts: [],
    custom: {},
    harm: { lesser: ['Bruised'], moderate: [], severe: [] },
    ...(over['characterData'] as object | undefined),
  },
  ...over,
});

function repos(overrides: Record<string, unknown> = {}, character = details()): DatabaseRepositories {
  return {
    profiles: { findByDiscordId: vi.fn().mockResolvedValue(ok({ id: 'p1', username: 'silks' })) },
    discordPlayers: { getActiveCharacterId: vi.fn().mockResolvedValue(ok('c1')) },
    characters: {
      findWithDetails: vi.fn().mockResolvedValue(ok(character)),
      findById: vi.fn().mockResolvedValue(ok(character)),
      addExperience: vi.fn().mockResolvedValue(ok({ ...character, experiencePoints: 5 })),
    },
    characterManagement: {
      updateCharacterWithValidation: vi
        .fn()
        .mockImplementation((_id: string, _uid: string, data: { characterData: { stress: number } }) =>
          Promise.resolve(ok({ ...character, characterData: data.characterData }))
        ),
      advanceCharacter: vi.fn().mockResolvedValue(ok(character)),
    },
    rolls: { create: vi.fn().mockResolvedValue(ok({ id: 'r1' })) },
    ...overrides,
  } as unknown as DatabaseRepositories;
}

const ctx = (r: DatabaseRepositories | null, faces: number[] = []): BotContext => ({
  realize: count => faces.slice(0, count),
  deploySha: 'test',
  siteUrl: 'https://heistmind.example',
  repos: r,
});

type Option = { name: string; type: number; value?: unknown };
const cmd = (name: string, sub: string, options: Option[] = []): APIApplicationCommandInteraction =>
  ({
    type: 2,
    user: { id: 'discord-1' },
    data: { name, type: 1, options: [{ name: sub, type: 1, options }] },
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

const content = (calls: { payload?: unknown }[]) =>
  String((calls[0]?.payload as { content?: string })?.content ?? '');

describe('/stress', () => {
  it('add marks the delta through the engine and reads back the track', async () => {
    const r = repos();
    const calls = await run(
      await handleStress(ctx(r), cmd('stress', 'add', [{ name: 'amount', type: 4, value: 2 }]))
    );
    expect(r.characterManagement.updateCharacterWithValidation).toHaveBeenCalledWith(
      'c1',
      'p1',
      expect.objectContaining({ characterData: expect.objectContaining({ stress: 6 }) })
    );
    expect(content(calls)).toContain('stress **6/9**');
  });

  it('clear at 0 is the no-op copy (engine clamps, nothing written)', async () => {
    const zeroed = details({ characterData: { stress: 0 } });
    const r = repos({}, zeroed);
    const calls = await run(
      await handleStress(ctx(r), cmd('stress', 'clear', [{ name: 'amount', type: 4, value: 3 }]))
    );
    expect(r.characterManagement.updateCharacterWithValidation).not.toHaveBeenCalled();
    expect(content(calls)).toContain('nothing changed');
  });

  it('no active character → delete + ephemeral hint', async () => {
    const r = repos({ discordPlayers: { getActiveCharacterId: vi.fn().mockResolvedValue(ok(null)) } });
    const calls = await run(
      await handleStress(ctx(r), cmd('stress', 'add', [{ name: 'amount', type: 4, value: 1 }]))
    );
    expect(calls.map(c => c.method)).toEqual(['delete', 'ephemeral']);
  });
});

describe('/harm', () => {
  it('take lands at the dealt level and logs the harm feed event', async () => {
    const r = repos();
    const calls = await run(
      await handleHarm(
        ctx(r),
        cmd('harm', 'take', [
          { name: 'level', type: 3, value: 'lesser' },
          { name: 'description', type: 3, value: 'Winded' },
        ])
      )
    );
    expect(r.rolls.create).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ kind: 'harm', note: 'Took lesser harm: Winded' })
    );
    expect(content(calls)).toContain('**lesser** harm: “Winded”');
    expect(content(calls)).not.toContain('landed at');
  });

  it('a full track escalates and the reply says so', async () => {
    // BitD lesser has 2 boxes; fill both → the new lesser harm lands moderate.
    const hurt = details({
      characterData: { stress: 4, harm: { lesser: ['Bruised', 'Winded'], moderate: [], severe: [] } },
    });
    const r = repos({}, hurt);
    const calls = await run(
      await handleHarm(
        ctx(r),
        cmd('harm', 'take', [
          { name: 'level', type: 3, value: 'lesser' },
          { name: 'description', type: 3, value: 'Slashed' },
        ])
      )
    );
    expect(content(calls)).toContain('**moderate** harm');
    expect(content(calls)).toContain('landed at **moderate**');
  });

  it('every track full → the trauma-territory refusal, ephemeral', async () => {
    const dying = details({
      characterData: {
        harm: { lesser: ['a', 'b'], moderate: ['c', 'd'], severe: ['e'] },
      },
    });
    const r = repos({}, dying);
    const calls = await run(
      await handleHarm(
        ctx(r),
        cmd('harm', 'take', [
          { name: 'level', type: 3, value: 'lesser' },
          { name: 'description', type: 3, value: 'x' },
        ])
      )
    );
    expect(calls.map(c => c.method)).toEqual(['delete', 'ephemeral']);
    expect(String(calls[1]?.payload)).toContain('trauma');
  });

  it('clear removes the picked entry; a missing one phrases the hint', async () => {
    const r = repos();
    const calls = await run(
      await handleHarm(
        ctx(r),
        cmd('harm', 'clear', [
          { name: 'level', type: 3, value: 'lesser' },
          { name: 'entry', type: 3, value: 'Bruised' },
        ])
      )
    );
    expect(content(calls)).toContain('“Bruised” cleared');

    const missing = await run(
      await handleHarm(
        ctx(repos()),
        cmd('harm', 'clear', [
          { name: 'level', type: 3, value: 'severe' },
          { name: 'entry', type: 3, value: 'Ghost wound' },
        ])
      )
    );
    expect(String(missing[1]?.payload)).toContain('No harm entry');
  });
});

describe('/vice indulge', () => {
  it('rolls the zero-dice pool (no attributes) and clears the LOWEST die of stress', async () => {
    const r = repos();
    const calls = await run(await handleVice(ctx(r, [3, 5]), cmd('vice', 'indulge')));
    const embed = (calls[0]?.payload as { embeds: APIEmbed[] }).embeds[0];
    // Lowest attribute 0 → 2d take-lowest → cleared 3; stress 4 → 1. Not overindulged.
    expect(embed?.title).toContain('0d (2d, take lowest)');
    expect(embed?.description).toContain('Cleared **3** stress — now 1/9');
    expect(embed?.description).not.toContain('Overindulged');
    expect(r.rolls.create).toHaveBeenCalledWith('p1', expect.objectContaining({ kind: 'downtime' }));
  });

  it('clearing more than was marked flags overindulgence', async () => {
    const rested = details({ characterData: { stress: 1 } });
    const r = repos({}, rested);
    const calls = await run(await handleVice(ctx(r, [4, 6]), cmd('vice', 'indulge')));
    const embed = (calls[0]?.payload as { embeds: APIEmbed[] }).embeds[0];
    expect(embed?.description).toContain('Overindulged');
  });
});

describe('/xp', () => {
  it('mark banks XP through the engine (ownership precheck + xp feed event)', async () => {
    const r = repos();
    const calls = await run(
      await handleXp(ctx(r), cmd('xp', 'mark', [{ name: 'amount', type: 4, value: 1 }]))
    );
    expect(r.characters.addExperience).toHaveBeenCalledWith('c1', 'p1', 1, expect.any(String));
    expect(r.rolls.create).toHaveBeenCalledWith('p1', expect.objectContaining({ kind: 'xp' }));
    expect(content(calls)).toContain('marks 1 XP — **5** banked');
  });

  it('advance decodes an ability pick and phrases the repo’s gate on refusal', async () => {
    const r = repos();
    const calls = await run(
      await handleXp(ctx(r), cmd('xp', 'advance', [{ name: 'pick', type: 3, value: 'ability:battleborn' }]))
    );
    expect(r.characterManagement.advanceCharacter).toHaveBeenCalledWith(
      'c1',
      'p1',
      expect.objectContaining({ type: 'ability', target: 'battleborn', cost: 2 })
    );
    expect(content(calls)).toContain('learned **Battleborn**');

    const gated = repos({
      characterManagement: {
        updateCharacterWithValidation: vi.fn(),
        advanceCharacter: vi.fn().mockResolvedValue(fail('Playbook track not full')),
      },
    });
    const refusal = await run(
      await handleXp(ctx(gated), cmd('xp', 'advance', [{ name: 'pick', type: 3, value: 'skill:skirmish' }]))
    );
    expect(String(refusal[1]?.payload)).toContain('Playbook track not full');
  });

  it('an unknown pick fails to the autocomplete hint without touching the engine', async () => {
    const r = repos();
    const calls = await run(
      await handleXp(ctx(r), cmd('xp', 'advance', [{ name: 'pick', type: 3, value: 'ability:nope' }]))
    );
    expect(r.characterManagement.advanceCharacter).not.toHaveBeenCalled();
    expect(String(calls[1]?.payload)).toContain('autocomplete');
  });
});

describe('sheet autocompletes', () => {
  const auto = (name: string, sub: string, options: Option[]): APIApplicationCommandAutocompleteInteraction =>
    ({
      type: 4,
      user: { id: 'discord-1' },
      data: { name, type: 1, options: [{ name: sub, type: 1, options }] },
    }) as unknown as APIApplicationCommandAutocompleteInteraction;

  it('harm clear suggests the picked level’s entries (all levels when unpicked)', async () => {
    const hurt = details({
      characterData: { harm: { lesser: ['Bruised'], moderate: ['Slashed'], severe: [] } },
    });
    const scoped = await harmAutocomplete(
      ctx(repos({}, hurt)),
      auto('harm', 'clear', [
        { name: 'level', type: 3, value: 'moderate' },
        { name: 'entry', type: 3, value: '' },
      ])
    );
    expect(scoped).toEqual([{ name: 'Slashed', value: 'Slashed' }]);
    clearActorCache();
    const all = await harmAutocomplete(
      ctx(repos({}, hurt)),
      auto('harm', 'clear', [{ name: 'entry', type: 3, value: '' }])
    );
    expect(all.map(c => c.value)).toEqual(['Bruised', 'Slashed']);
  });

  it('xp advance offers unowned abilities and action dots with ratings', async () => {
    const choices = await xpAutocomplete(
      ctx(repos()),
      auto('xp', 'advance', [{ name: 'pick', type: 3, value: '' }])
    );
    expect(choices).toEqual([
      { name: 'Learn Battleborn', value: 'ability:battleborn' },
      { name: '+1 Skirmish dot (2→3)', value: 'skill:skirmish' },
    ]);
  });

  it('degrades to [] with no repos', async () => {
    expect(await harmAutocomplete(ctx(null), auto('harm', 'clear', []))).toEqual([]);
    expect(await xpAutocomplete(ctx(null), auto('xp', 'advance', []))).toEqual([]);
  });
});
