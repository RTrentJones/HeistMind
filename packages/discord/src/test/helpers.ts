// Shared scaffolding for the command suites — ONE copy of the FollowUp stub, the Result
// helpers, the BotContext builder, and the union repo factory that every suite used to carry
// locally. Fixture-provenance rule (F69): character fixtures ride the REAL shipped
// DEFAULT_RULESET — tests must not invent content shapes, and any rating keys a name that
// `rulesetActions` actually derives from that content. Coverage-neutral: `**/test/**` is
// excluded by configs/vitest.base.ts.
import { vi } from 'vitest';
import { rulesetActions, type RulesetContent } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { DEFAULT_RULESET } from '@heist-mind/shared';
import type { BotContext, FollowUpClient, HandlerResult } from '../types';

// ===== Result helpers =====

export const ok = <T>(data: T) => ({ success: true as const, data });
export const fail = (message: string, code?: string) => ({
  success: false as const,
  error: { message, ...(code ? { code } : {}) },
});

// ===== Shared fixtures =====

export const PROFILE = { id: 'p1', username: 'silks' };
export const CHARACTERS = [
  { id: 'c1', name: 'Silks', createdBy: 'p1' },
  { id: 'c2', name: 'Marrow', createdBy: 'p1' },
];
export const GAME = {
  id: 'g1',
  name: 'The Docks Job',
  state: 'active',
  discordGuildId: 'guild-1',
  discordChannelId: 'chan-1',
};
export const CREW = {
  id: 'cr1',
  gameId: 'g1',
  name: 'The Silver Nails',
  tier: 1,
  rep: 13,
  heat: 8,
  wanted: 2,
};
export const CLOCK = { id: 'cl1', gameId: 'g1', name: 'Alarm', filled: 3, segments: 4 };
export const FACTION = { id: 'f1', gameId: 'g1', name: 'The Hive', status: 1 };

/** The default ruleset's first canonical action — rated 2 on `characterOnDefaultRuleset()`. */
export const RATED_ACTION = rulesetActions(DEFAULT_RULESET)[0]!;
/** A second canonical action left UNRATED on the fixture, for zero-dice paths. */
export const UNRATED_ACTION = rulesetActions(DEFAULT_RULESET)[1]!;
/** The default ruleset's first attribute name, for resistance labels. */
export const ATTRIBUTE = DEFAULT_RULESET.attributes[0]!.name;

type Overrides = Record<string, unknown>;

/** A CharacterWithDetails-shaped fixture on the given ruleset content (no rated actions). */
export function characterOn(content: RulesetContent, overrides: Overrides = {}) {
  const { characterData, ...rest } = overrides;
  return {
    id: 'c1',
    name: 'Silks',
    createdBy: 'p1',
    gameId: 'g1',
    game: null,
    ruleset: { content },
    characterData: {
      playbook: content.playbooks[0]?.id ?? 'none',
      skills: {},
      attributes: {},
      specialAbilities: [],
      stress: 0,
      trauma: [],
      contacts: [],
      custom: {},
      ...(characterData as object | undefined),
    },
    ...rest,
  };
}

/** The go-to fixture: a scoundrel on the shipped DEFAULT_RULESET with RATED_ACTION at 2. */
export function characterOnDefaultRuleset(overrides: Overrides = {}) {
  const { characterData, ...rest } = overrides;
  return characterOn(DEFAULT_RULESET, {
    characterData: { skills: { [RATED_ACTION]: 2 }, ...(characterData as object | undefined) },
    ...rest,
  });
}

// ===== Repo factory =====

/**
 * The union repo factory: vi.fn() mocks over the shared fixtures, covering every section any
 * command suite touches. An override replaces its whole top-level section — the same
 * shallow-merge semantics each suite's local factory had.
 */
export function repos(
  overrides: Overrides = {},
  character: Record<string, unknown> = characterOnDefaultRuleset()
): DatabaseRepositories {
  return {
    profiles: { findByDiscordId: vi.fn().mockResolvedValue(ok(PROFILE)) },
    discordPlayers: {
      setActiveCharacter: vi.fn().mockResolvedValue(ok(undefined)),
      clearActiveCharacter: vi.fn().mockResolvedValue(ok(undefined)),
      getActiveCharacterId: vi.fn().mockResolvedValue(ok('c1')),
    },
    characters: {
      findByPlayer: vi.fn().mockResolvedValue(ok(CHARACTERS)),
      findByGame: vi.fn().mockResolvedValue(ok(CHARACTERS.slice(0, 1))),
      findWithDetails: vi.fn().mockResolvedValue(ok(character)),
      findById: vi.fn().mockResolvedValue(ok(character)),
      addExperience: vi.fn().mockImplementation((_id: string, _uid: string, amount: number) =>
        Promise.resolve(
          ok({
            ...character,
            experiencePoints: ((character['experiencePoints'] as number | undefined) ?? 0) + amount,
          })
        )
      ),
    },
    games: {
      findByCreator: vi.fn().mockResolvedValue(ok([GAME])),
      findByDiscordChannel: vi.fn().mockResolvedValue(ok(GAME)),
      setDiscordLink: vi.fn().mockResolvedValue(ok(GAME)),
    },
    gamePlayers: {
      isGameMaster: vi.fn().mockResolvedValue(ok(true)),
      findByGame: vi.fn().mockResolvedValue(ok([{ playerId: 'p1', status: 'active' }])),
    },
    scores: {
      start: vi.fn().mockResolvedValue(ok({ id: 's1', name: 'The Vault' })),
      end: vi.fn().mockResolvedValue(ok({ id: 's1', name: 'The Vault' })),
      findActive: vi.fn().mockResolvedValue(ok({ id: 's1', name: 'The Vault' })),
    },
    crews: {
      findByGame: vi.fn().mockResolvedValue(ok(CREW)),
      update: vi
        .fn()
        .mockImplementation((_id: string, patch: object) =>
          Promise.resolve(ok({ ...CREW, ...patch }))
        ),
    },
    clocks: {
      findByGame: vi.fn().mockResolvedValue(ok([CLOCK])),
      update: vi
        .fn()
        .mockImplementation((_id: string, patch: object) =>
          Promise.resolve(ok({ ...CLOCK, ...patch }))
        ),
    },
    factions: {
      findByGame: vi.fn().mockResolvedValue(ok([FACTION])),
      update: vi
        .fn()
        .mockImplementation((_id: string, patch: object) =>
          Promise.resolve(ok({ ...FACTION, ...patch }))
        ),
    },
    rolls: { create: vi.fn().mockResolvedValue(ok({ id: 'r1' })) },
    characterManagement: {
      updateCharacterWithValidation: vi
        .fn()
        .mockImplementation((_id: string, _uid: string, data: { characterData: object }) =>
          Promise.resolve(ok({ ...character, characterData: data.characterData }))
        ),
      advanceCharacter: vi.fn().mockResolvedValue(ok(character)),
    },
    ...overrides,
  } as unknown as DatabaseRepositories;
}

// ===== Context + FollowUp capture =====

/** The standard BotContext: scripted dice via `faces`, test SHA, example site URL. */
export const ctx = (r: DatabaseRepositories | null, faces: number[] = []): BotContext => ({
  realize: count => faces.slice(0, count),
  deploySha: 'test',
  siteUrl: 'https://heistmind.example',
  repos: r,
});

/** A FollowUpClient stub that records {method, payload} calls instead of hitting Discord. */
export function captureFollowUp() {
  const calls: { method: string; payload?: unknown }[] = [];
  const client: FollowUpClient = {
    editOriginal: payload => (calls.push({ method: 'edit', payload }), Promise.resolve()),
    deleteOriginal: () => (calls.push({ method: 'delete' }), Promise.resolve()),
    sendEphemeral: text => (calls.push({ method: 'ephemeral', payload: text }), Promise.resolve()),
  };
  return { client, calls };
}

/** Asserts the result deferred, runs its work against the capture stub, returns the calls. */
export async function run(result: HandlerResult) {
  const { client, calls } = captureFollowUp();
  if (!result.work) throw new Error('expected deferred work');
  await result.work(client);
  return calls;
}

/** The first edit payload's content string ('' when absent). */
export const content = (calls: { payload?: unknown }[]) =>
  String((calls[0]?.payload as { content?: string })?.content ?? '');
