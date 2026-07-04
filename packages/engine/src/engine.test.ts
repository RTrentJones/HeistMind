// The engine's behavior spec — every use-case exercised against mocked repositories, no DB, no
// browser. These tests are also the Discord bot's contract: a command wrapping a use-case can rely
// on exactly this sequencing.
import { describe, expect, it, vi } from 'vitest';
import type {
  Character,
  CharacterWithDetails,
  Clock,
  Crew,
  Faction,
  Result,
} from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import {
  advanceCharacter,
  applyStress,
  clearHarm,
  markXp,
  retireCharacter,
  takeHarm,
} from './characters';
import { tickClock } from './clocks';
import { advanceCrewTier, applyCrewHeat, incarcerateCrew } from './crews';
import { indulgeVice, viceDicePool } from './downtime';
import { setFactionStatus } from './factions';
import { saveLoadout } from './loadout';
import { rollAction, rollResistance } from './rolls';
import { endScore, startScore } from './scores';

const ok = <T>(data: T): Result<T> => ({ success: true, data });
const fail = (message: string): Result<never> => ({ success: false, error: { message } });

// A BitD-ish character on a default 9-stress track, sitting at stress 6.
const CONTENT = {} as CharacterWithDetails['ruleset']['content'];
const CHARACTER = {
  id: 'c1',
  name: 'Silks',
  gameId: 'g1',
  createdBy: 'u1',
  ruleset: { content: CONTENT },
  characterData: {
    playbook: 'cutter',
    attributes: { insight: 1, prowess: 2, resolve: 3 },
    skills: {},
    specialAbilities: [],
    stress: 6,
    trauma: [],
    contacts: [],
    custom: {},
  },
} as unknown as CharacterWithDetails;

function repos(overrides: Record<string, unknown>): DatabaseRepositories {
  return overrides as unknown as DatabaseRepositories;
}

describe('applyStress', () => {
  it('adds and clamps stress through the validated write', async () => {
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const r = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(CHARACTER)) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    await applyStress(r, { characterId: 'c1', userId: 'u1', stress: 5 });
    // 6 + 5 clamps to the default 9-stress track.
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({ stress: 9 }),
    });
  });

  it('is a no-op success for zero cost and for already-clamped characters', async () => {
    const update = vi.fn();
    const maxed = {
      ...CHARACTER,
      characterData: { ...CHARACTER.characterData, stress: 9 },
    } as CharacterWithDetails;
    const r = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(maxed)) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    expect(await applyStress(r, { characterId: 'c1', userId: 'u1', stress: 0 })).toEqual(ok(null));
    expect(await applyStress(r, { characterId: 'c1', userId: 'u1', stress: 3 })).toEqual(ok(null));
    expect(update).not.toHaveBeenCalled();
  });

  it('a negative delta CLEARS stress, clamped at 0', async () => {
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const atOne = {
      ...CHARACTER,
      characterData: { ...CHARACTER.characterData, stress: 1 },
    } as CharacterWithDetails;
    const r = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(atOne)) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    await applyStress(r, { characterId: 'c1', userId: 'u1', stress: -3 });
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({ stress: 0 }),
    });
  });
});

describe('rollAction', () => {
  it('persists the roll and charges the push cost', async () => {
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const r = repos({
      rolls: { create },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(CHARACTER)) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    const out = await rollAction(r, {
      gameId: 'g1',
      userId: 'u1',
      characterId: 'c1',
      kind: 'action',
      label: 'skirmish',
      dice: 3,
      results: [6, 4, 2],
      zeroDice: false,
      pushed: true,
    });
    expect(out.success).toBe(true);
    expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ kind: 'action' }));
    // Push costs 2: 6 → 8.
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({ stress: 8 }),
    });
  });

  it('does not touch stress on an unpushed roll and surfaces create failures', async () => {
    const update = vi.fn();
    const r = repos({
      rolls: { create: vi.fn().mockResolvedValue(fail('nope')) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    const out = await rollAction(r, {
      gameId: 'g1',
      userId: 'u1',
      kind: 'fortune',
      label: 'Fortune',
      dice: 2,
      results: [3, 5],
      zeroDice: false,
    });
    expect(out).toEqual(fail('nope'));
    expect(update).not.toHaveBeenCalled();
  });
});

describe('rollResistance', () => {
  it('persists the roll and charges 6 − highest die', async () => {
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const r = repos({
      rolls: { create },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(CHARACTER)) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    const out = await rollResistance(r, {
      gameId: 'g1',
      userId: 'u1',
      characterId: 'c1',
      dice: 2,
      results: [4, 2], // highest 4 → 2 stress
      zeroDice: false,
    });
    expect(out.success && out.data.stress).toBe(2);
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({ stress: 8 }),
    });
  });

  it('charges nothing on a single 6 (resists for free)', async () => {
    const update = vi.fn();
    const r = repos({
      rolls: { create: vi.fn().mockResolvedValue(ok({ id: 'r1' })) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    const out = await rollResistance(r, {
      gameId: 'g1',
      userId: 'u1',
      characterId: 'c1',
      dice: 2,
      results: [6, 3],
      zeroDice: false,
    });
    expect(out.success && out.data.stress).toBe(0);
    expect(update).not.toHaveBeenCalled();
  });

  it('a CRITICAL resist (two 6s) CLEARS 1 stress, per RAW', async () => {
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const r = repos({
      rolls: { create },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(CHARACTER)) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    const out = await rollResistance(r, {
      gameId: 'g1',
      userId: 'u1',
      characterId: 'c1',
      dice: 2,
      results: [6, 6],
      zeroDice: false,
    });
    expect(out.success && out.data.stress).toBe(-1);
    // CHARACTER sits at stress 6 → the crit clears one → 5.
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({ stress: 5 }),
    });
  });

  it('a ZERO-DICE resist takes the LOWEST die (F64)', async () => {
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const r = repos({
      rolls: { create },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(CHARACTER)) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    const out = await rollResistance(r, {
      gameId: 'g1',
      userId: 'u1',
      characterId: 'c1',
      dice: 0,
      results: [1, 6], // take-lowest → effective 1 → 5 stress (NOT free)
      zeroDice: true,
    });
    expect(out.success && out.data.stress).toBe(5);
    // 6 + 5 clamps to the default 9-stress track.
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({ stress: 9 }),
    });
  });
});

describe('indulgeVice', () => {
  it('derives the pool from the lowest attribute (empty fixture → 0 rating → 2d take-lowest)', () => {
    // The bare fixture has no ruleset attribute definitions, so the lowest derived attribute is 0
    // and FitD's zero-dice rule applies: roll 2, take the LOWEST.
    expect(viceDicePool(CHARACTER)).toEqual({ count: 2, zeroDice: true });
  });

  it('clears stress, logs the downtime, and flags overindulgence', async () => {
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({
      characterManagement: { updateCharacterWithValidation: update },
      rolls: { create },
    });
    const out = await indulgeVice(r, {
      character: CHARACTER,
      userId: 'u1',
      results: [6], // clears 6 with 6 marked — cleared === stress is NOT overindulgence
      zeroDice: false,
      logLabel: 'Indulged (cleared 6)',
    });
    expect(out).toEqual(ok({ cleared: 6, overindulged: false, nextStress: 0 }));
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({ stress: 0 }),
    });
    expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ kind: 'downtime' }));
  });

  it('skips the campaign log for a standalone character', async () => {
    const create = vi.fn();
    const standalone = { ...CHARACTER, gameId: null } as CharacterWithDetails;
    const r = repos({
      characterManagement: {
        updateCharacterWithValidation: vi.fn().mockResolvedValue(ok({} as Character)),
      },
      rolls: { create },
    });
    const out = await indulgeVice(r, {
      character: standalone,
      userId: 'u1',
      results: [2],
      zeroDice: false,
      logLabel: 'x',
    });
    expect(out.success).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('retireCharacter', () => {
  it('banks carried coin into stash and logs the note', async () => {
    const withCoin = {
      ...CHARACTER,
      characterData: { ...CHARACTER.characterData, coins: 3, stash: 4 },
    } as unknown as Character;
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({ characters: { update }, rolls: { create } });
    await retireCharacter(r, { character: withCoin, userId: 'u1', gameId: 'g1', logNote: 'gone' });
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      status: 'retired',
      characterData: expect.objectContaining({ coins: 0, stash: 7 }),
    });
    expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ kind: 'note' }));
  });
});

describe('scores', () => {
  it('startScore creates the score then logs its event tagged with the score id', async () => {
    const start = vi.fn().mockResolvedValue(ok({ id: 's1', name: 'Docks' }));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({ scores: { start }, rolls: { create } });
    const out = await startScore(r, {
      gameId: 'g1',
      userId: 'u1',
      name: 'Docks',
      logLabel: 'Docks',
      logNote: 'started',
    });
    expect(out.success).toBe(true);
    expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ scoreId: 's1' }));
  });

  it('endScore ends then logs, tagged explicitly (the score is no longer active)', async () => {
    const end = vi.fn().mockResolvedValue(ok({ id: 's1' }));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({ scores: { end }, rolls: { create } });
    await endScore(r, {
      gameId: 'g1',
      userId: 'u1',
      scoreId: 's1',
      logLabel: 'Docks',
      logNote: 'ended',
    });
    expect(end).toHaveBeenCalledWith('s1');
    expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ scoreId: 's1' }));
  });
});

describe('saveLoadout', () => {
  it('persists the loadout through the VALIDATED path and logs to the campaign feed', async () => {
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({
      characterManagement: { updateCharacterWithValidation: update },
      rolls: { create },
    });
    const out = await saveLoadout(r, {
      character: CHARACTER,
      userId: 'u1',
      loadout: { level: 'light', items: ['blade'], scoreId: 's1' },
      logNote: 'light load',
    });
    expect(out.success).toBe(true);
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({
        loadout: { level: 'light', items: ['blade'], scoreId: 's1' },
      }),
    });
    expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ kind: 'loadout' }));
  });

  it('skips the feed for a standalone character but still saves', async () => {
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const create = vi.fn();
    const standalone = { ...CHARACTER, gameId: null } as CharacterWithDetails;
    const r = repos({
      characterManagement: { updateCharacterWithValidation: update },
      rolls: { create },
    });
    const out = await saveLoadout(r, {
      character: standalone,
      userId: 'u1',
      loadout: { level: 'normal', items: [] },
      logNote: 'x',
    });
    expect(out.success).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });
});

// ----- feed-completeness use-cases (round 3): crew / faction / clock / XP -----------------------

const CREW = {
  id: 'cr1',
  gameId: 'g1',
  name: 'The Silver Nails',
  tier: 1,
  rep: 13,
  heat: 8,
  wanted: 2,
} as unknown as Crew;

describe('crew progression', () => {
  it('applyCrewHeat runs the heat→wanted cascade and logs a crew event', async () => {
    const update = vi.fn().mockResolvedValue(ok(CREW));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({ crews: { update }, rolls: { create } });
    const out = await applyCrewHeat(r, {
      crew: CREW,
      userId: 'u1',
      amount: 1,
      logLabel: 'Crew',
      logNote: 'heat',
    });
    expect(out.success).toBe(true);
    // 8 + 1 fills the 9-heat track → +1 wanted, heat resets to the remainder (0).
    expect(update).toHaveBeenCalledWith('cr1', { heat: 0, wanted: 3 });
    expect(create).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ gameId: 'g1', kind: 'crew', label: 'Crew', note: 'heat' })
    );
  });

  it('advanceCrewTier spends a full Rep track and logs', async () => {
    const update = vi.fn().mockResolvedValue(ok(CREW));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({ crews: { update }, rolls: { create } });
    await advanceCrewTier(r, { crew: CREW, userId: 'u1', logLabel: 'l', logNote: 'n' });
    expect(update).toHaveBeenCalledWith('cr1', { tier: 2, rep: 1 });
    expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ kind: 'crew' }));
  });

  it('incarcerateCrew clears heat, drops wanted, and logs; a failed write never logs', async () => {
    const update = vi.fn().mockResolvedValue(ok(CREW));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({ crews: { update }, rolls: { create } });
    await incarcerateCrew(r, { crew: CREW, userId: 'u1', logLabel: 'l', logNote: 'n' });
    expect(update).toHaveBeenCalledWith('cr1', { heat: 0, wanted: 1 });
    expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ kind: 'crew' }));

    const failing = repos({
      crews: { update: vi.fn().mockResolvedValue(fail('rls')) },
      rolls: { create: vi.fn() },
    });
    const out = await incarcerateCrew(failing, {
      crew: CREW,
      userId: 'u1',
      logLabel: 'l',
      logNote: 'n',
    });
    expect(out.success).toBe(false);
    expect((failing as unknown as { rolls: { create: unknown } }).rolls.create).not
      .toHaveBeenCalled;
  });
});

describe('setFactionStatus', () => {
  const FACTION = { id: 'f1', gameId: 'g1', name: 'The Hive', status: 1 } as unknown as Faction;

  it('clamps into the FitD band, persists, and logs a faction event', async () => {
    const update = vi.fn().mockResolvedValue(ok(FACTION));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({ factions: { update }, rolls: { create } });
    const out = await setFactionStatus(r, {
      faction: FACTION,
      userId: 'u1',
      status: 7,
      logLabel: 'The Hive',
      logNote: 'allied',
    });
    expect(out.success).toBe(true);
    expect(update).toHaveBeenCalledWith('f1', { status: 3 });
    expect(create).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ gameId: 'g1', kind: 'faction', label: 'The Hive' })
    );
  });
});

describe('tickClock', () => {
  const CLOCK = {
    id: 'k1',
    gameId: 'g1',
    name: 'The Alarm',
    segments: 4,
    filled: 3,
  } as unknown as Clock;

  it('logs a clock event only when the tick FILLS the clock', async () => {
    const update = vi.fn().mockResolvedValue(ok({ ...CLOCK, filled: 4 }));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({ clocks: { update }, rolls: { create } });
    const out = await tickClock(r, {
      clock: CLOCK,
      userId: 'u1',
      delta: 1,
      logLabel: 'The Alarm',
      logNote: 'filled',
    });
    expect(update).toHaveBeenCalledWith('k1', { filled: 4 });
    expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ kind: 'clock' }));
    expect(out.success && out.data.completed).toBe(true);
  });

  it('a routine (non-completing) tick clamps and stays out of the feed', async () => {
    const midway = { ...CLOCK, filled: 1 } as Clock;
    const update = vi.fn().mockResolvedValue(ok({ ...midway, filled: 2 }));
    const create = vi.fn();
    const r = repos({ clocks: { update }, rolls: { create } });
    const out = await tickClock(r, {
      clock: midway,
      userId: 'u1',
      delta: 1,
      logLabel: 'x',
      logNote: 'x',
    });
    expect(create).not.toHaveBeenCalled();
    expect(out.success && out.data.completed).toBe(false);

    // An under-tick clamps at 0 (and an already-not-complete clock stays out of the feed).
    await tickClock(r, { clock: midway, userId: 'u1', delta: -99, logLabel: 'x', logNote: 'x' });
    expect(update).toHaveBeenLastCalledWith('k1', { filled: 0 });
  });
});

describe('XP economy', () => {
  // The ownership precheck (service-role callers bypass RLS) reads the character by id first.
  const owns = () => vi.fn().mockResolvedValue(ok({ id: 'c1', createdBy: 'u1' } as Character));

  it('markXp records the award and logs an xp event for a campaign character', async () => {
    const addExperience = vi.fn().mockResolvedValue(ok({ id: 'c1', gameId: 'g1' } as Character));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({ characters: { addExperience, findById: owns() }, rolls: { create } });
    const out = await markXp(r, {
      characterId: 'c1',
      userId: 'u1',
      amount: 1,
      reason: 'Manual award',
      logLabel: 'Silks',
      logNote: 'Marked 1 XP',
    });
    expect(out.success).toBe(true);
    expect(addExperience).toHaveBeenCalledWith('c1', 'u1', 1, 'Manual award');
    expect(create).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ gameId: 'g1', characterId: 'c1', kind: 'xp' })
    );
  });

  it('markXp skips the feed for a standalone character', async () => {
    const addExperience = vi.fn().mockResolvedValue(ok({ id: 'c1', gameId: null } as Character));
    const create = vi.fn();
    const r = repos({ characters: { addExperience, findById: owns() }, rolls: { create } });
    const out = await markXp(r, {
      characterId: 'c1',
      userId: 'u1',
      amount: 1,
      reason: 'x',
      logLabel: 'x',
      logNote: 'x',
    });
    expect(out.success).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });

  it('advanceCharacter routes through the validated advance and logs an xp event', async () => {
    const advance = vi.fn().mockResolvedValue(ok({ id: 'c1', gameId: 'g1' } as Character));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({
      characters: { findById: owns() },
      characterManagement: { advanceCharacter: advance },
      rolls: { create },
    });
    const out = await advanceCharacter(r, {
      characterId: 'c1',
      userId: 'u1',
      advancement: { type: 'ability', target: 'battleborn', cost: 1, description: 'Learn it' },
      logLabel: 'Silks',
      logNote: 'Spent XP: learned Battleborn',
    });
    expect(out.success).toBe(true);
    expect(advance).toHaveBeenCalledWith('c1', 'u1', expect.objectContaining({ type: 'ability' }));
    expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ kind: 'xp' }));
  });

  it('advanceCharacter forwards a gated (rejected) advance without logging', async () => {
    const advance = vi.fn().mockResolvedValue(fail('track not full'));
    const create = vi.fn();
    const r = repos({
      characters: { findById: owns() },
      characterManagement: { advanceCharacter: advance },
      rolls: { create },
    });
    const out = await advanceCharacter(r, {
      characterId: 'c1',
      userId: 'u1',
      advancement: { type: 'skill', target: 'prowl', value: 1, cost: 0, description: 'x' },
      logLabel: 'x',
      logNote: 'x',
    });
    expect(out.success).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });
});

// ----- harm (bot phase 3): take with RAW escalation, clear one entry, both logged ---------------

const withHarm = (harm: { lesser?: string[]; moderate?: string[]; severe?: string[] }) =>
  ({
    ...CHARACTER,
    characterData: {
      ...CHARACTER.characterData,
      harm: { lesser: [], moderate: [], severe: [], ...harm },
    },
  }) as unknown as CharacterWithDetails;

// ONE shared level-aware note factory (rather than per-test arrows: several tests fail before
// logging, and a never-invoked closure would ding the file's function coverage).
const levelNote = (level: string) => `took ${level}`;

describe('takeHarm', () => {
  it('lands at the dealt level, writes the sheet, and logs a level-aware harm event', async () => {
    const update = vi.fn().mockResolvedValue(ok({ id: 'c1' } as Character));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(CHARACTER)) },
      characterManagement: { updateCharacterWithValidation: update },
      rolls: { create },
    });
    const out = await takeHarm(r, {
      characterId: 'c1',
      userId: 'u1',
      level: 'lesser',
      description: 'Bruised',
      logLabel: 'Silks',
      logNote: levelNote,
    });
    expect(out.success).toBe(true);
    if (out.success) expect(out.data.appliedLevel).toBe('lesser');
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({
        harm: { lesser: ['Bruised'], moderate: [], severe: [] },
      }),
    });
    expect(create).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ kind: 'harm', note: 'took lesser' })
    );
  });

  it('escalates past FULL tracks the RAW way (lesser full → lands moderate)', async () => {
    // BitD defaults: 2 lesser boxes — both taken, so the new lesser harm becomes moderate.
    const hurt = withHarm({ lesser: ['Bruised', 'Winded'] });
    const update = vi.fn().mockResolvedValue(ok({ id: 'c1' } as Character));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(hurt)) },
      characterManagement: { updateCharacterWithValidation: update },
      rolls: { create },
    });
    const out = await takeHarm(r, {
      characterId: 'c1',
      userId: 'u1',
      level: 'lesser',
      description: 'Slashed',
      logLabel: 'Silks',
      logNote: levelNote,
    });
    expect(out.success).toBe(true);
    if (out.success) expect(out.data.appliedLevel).toBe('moderate');
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({
        harm: expect.objectContaining({ moderate: ['Slashed'] }),
      }),
    });
    expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ note: 'took moderate' }));
  });

  it('every track full → HARM_FULL failure, nothing written', async () => {
    const dying = withHarm({
      lesser: ['a', 'b'],
      moderate: ['c', 'd'],
      severe: ['e'],
    });
    const update = vi.fn();
    const r = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(dying)) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    const out = await takeHarm(r, {
      characterId: 'c1',
      userId: 'u1',
      level: 'lesser',
      description: 'x',
      logLabel: 'x',
      logNote: levelNote,
    });
    expect(out.success).toBe(false);
    if (!out.success) expect(out.error.code).toBe('HARM_FULL');
    expect(update).not.toHaveBeenCalled();
  });

  it('a standalone character takes the harm with no feed to write to', async () => {
    const standalone = { ...CHARACTER, gameId: null } as CharacterWithDetails;
    const create = vi.fn();
    const r = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(standalone)) },
      characterManagement: {
        updateCharacterWithValidation: vi.fn().mockResolvedValue(ok({} as Character)),
      },
      rolls: { create },
    });
    const out = await takeHarm(r, {
      characterId: 'c1',
      userId: 'u1',
      level: 'severe',
      description: 'Shot',
      logLabel: 'x',
      logNote: levelNote,
    });
    expect(out.success).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('clearHarm', () => {
  it('removes exactly ONE matching entry and logs the recovery', async () => {
    const hurt = withHarm({ lesser: ['Bruised', 'Bruised'] });
    const update = vi.fn().mockResolvedValue(ok({ id: 'c1' } as Character));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(hurt)) },
      characterManagement: { updateCharacterWithValidation: update },
      rolls: { create },
    });
    const out = await clearHarm(r, {
      characterId: 'c1',
      userId: 'u1',
      level: 'lesser',
      description: 'Bruised',
      logLabel: 'Silks',
      logNote: 'healed: Bruised',
    });
    expect(out.success).toBe(true);
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({
        harm: expect.objectContaining({ lesser: ['Bruised'] }),
      }),
    });
    expect(create).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ kind: 'harm', note: 'healed: Bruised' })
    );
  });

  it('no matching entry → HARM_NOT_FOUND, nothing written', async () => {
    const update = vi.fn();
    const r = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(CHARACTER)) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    const out = await clearHarm(r, {
      characterId: 'c1',
      userId: 'u1',
      level: 'severe',
      description: 'Ghost wound',
      logLabel: 'x',
      logNote: 'x',
    });
    expect(out.success).toBe(false);
    if (!out.success) expect(out.error.code).toBe('HARM_NOT_FOUND');
    expect(update).not.toHaveBeenCalled();
  });
});

// ----- the engine-level ownership gate (service-role callers bypass RLS) ------------------------

describe('ownership assertions', () => {
  const STRANGER = 'someone-else';
  const NOT_OWNER = { message: 'Not the character owner', code: 'NOT_OWNER' };

  it('every character-mutating use-case refuses a non-owner before writing', async () => {
    const update = vi.fn();
    const create = vi.fn();
    const r = repos({
      characters: {
        findWithDetails: vi.fn().mockResolvedValue(ok(CHARACTER)),
        findById: vi.fn().mockResolvedValue(ok(CHARACTER)),
        update,
        addExperience: update,
      },
      characterManagement: { updateCharacterWithValidation: update, advanceCharacter: update },
      rolls: { create },
    });
    const results = await Promise.all([
      applyStress(r, { characterId: 'c1', userId: STRANGER, stress: 2 }),
      takeHarm(r, {
        characterId: 'c1',
        userId: STRANGER,
        level: 'lesser',
        description: 'x',
        logLabel: 'x',
        logNote: levelNote,
      }),
      clearHarm(r, {
        characterId: 'c1',
        userId: STRANGER,
        level: 'lesser',
        description: 'x',
        logLabel: 'x',
        logNote: 'x',
      }),
      markXp(r, {
        characterId: 'c1',
        userId: STRANGER,
        amount: 1,
        reason: 'x',
        logLabel: 'x',
        logNote: 'x',
      }),
      advanceCharacter(r, {
        characterId: 'c1',
        userId: STRANGER,
        advancement: { type: 'ability', target: 'x', cost: 1, description: 'x' },
        logLabel: 'x',
        logNote: 'x',
      }),
      retireCharacter(r, {
        character: CHARACTER as unknown as Character,
        userId: STRANGER,
        gameId: 'g1',
        logNote: 'x',
      }),
      indulgeVice(r, {
        character: CHARACTER,
        userId: STRANGER,
        results: [4],
        zeroDice: false,
        logLabel: 'x',
      }),
      saveLoadout(r, {
        character: CHARACTER,
        userId: STRANGER,
        loadout: { level: 'light', items: [] },
        logNote: 'x',
      }),
    ]);
    for (const out of results) {
      expect(out.success).toBe(false);
      if (!out.success) expect(out.error).toEqual(NOT_OWNER);
    }
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
