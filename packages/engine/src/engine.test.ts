// The engine's behavior spec — every use-case exercised against mocked repositories, no DB, no
// browser. These tests are also the Discord bot's contract: a command wrapping a use-case can rely
// on exactly this sequencing.
import { describe, expect, it, vi } from 'vitest';
import { availableArmor, xpTrackSize } from '@heist-mind/core';
import type {
  Character,
  CharacterWithDetails,
  Clock,
  Crew,
  Faction,
  Result,
} from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { DEFAULT_RULESET, getBuiltinById } from '@heist-mind/shared';
import {
  advanceCharacter,
  applyStress,
  chooseTrauma,
  clearHarm,
  markXp,
  retireCharacter,
  takeHarm,
} from './characters';
import { tickClock } from './clocks';
import {
  advanceCrewTier,
  applyCrewHeat,
  incarcerateCrew,
  markCrewXp,
  takeCrewAdvance,
} from './crews';
import { flashback, indulgeVice, viceDicePool } from './downtime';
import { setFactionStatus } from './factions';
import { saveLoadout } from './loadout';
import { markDesperateRollXp, rollAction, rollResistance } from './rolls';
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
    vice: 'Gambling',
    contacts: [],
    custom: {},
  },
} as unknown as CharacterWithDetails;

function repos(overrides: Record<string, unknown>): DatabaseRepositories {
  // Default: the campaign has no crew yet (no crew-granted stress boxes); suites override `crews`.
  return {
    crews: { findByGame: vi.fn().mockResolvedValue(ok(null)) },
    ...overrides,
  } as unknown as DatabaseRepositories;
}

describe('applyStress', () => {
  it('adds stress through the validated write', async () => {
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const r = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(CHARACTER)) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    const out = await applyStress(r, { characterId: 'c1', userId: 'u1', stress: 2 });
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({ stress: 8 }),
    });
    expect(out.success && out.data?.trauma).toBe(false);
  });

  it("lets the campaign's GM mark stress on a player's character (owner-or-GM, like the RLS write)", async () => {
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const asGmGame = {
      ...CHARACTER,
      createdBy: 'player-1',
      game: { createdBy: 'gm-1' },
    } as unknown as CharacterWithDetails;
    const r = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(asGmGame)) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    const out = await applyStress(r, { characterId: 'c1', userId: 'gm-1', stress: 2 });
    expect(out.success).toBe(true);
    expect(update).toHaveBeenCalledWith('c1', 'gm-1', {
      characterData: expect.objectContaining({ stress: 8 }),
    });
  });

  it('refuses (writes nothing) when the crew lookup fails — never judges a possibly-short track', async () => {
    const update = vi.fn();
    const r = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(CHARACTER)) },
      characterManagement: { updateCharacterWithValidation: update },
      crews: {
        findByGame: vi.fn().mockResolvedValue({ success: false, error: { message: 'db down' } }),
      },
    });
    const out = await applyStress(r, { characterId: 'c1', userId: 'u1', stress: 3 });
    expect(out.success).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("counts the campaign crew's stress boxes before calling an overflow", async () => {
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const content = structuredClone(CHARACTER.ruleset.content);
    content.crew = {
      ...(content.crew ?? { types: [] }),
      abilities: [
        { id: 'crew-hardened', name: 'Hardened', description: '', effects: { stressBoxes: 1 } },
      ],
    } as typeof content.crew;
    const onCrew = { ...CHARACTER, ruleset: { ...CHARACTER.ruleset, content } };
    const r = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(onCrew)) },
      characterManagement: { updateCharacterWithValidation: update },
      crews: { findByGame: vi.fn().mockResolvedValue(ok({ crewAbilities: ['crew-hardened'] })) },
    });
    // 6 + 3 = 9: the base track would overflow here, but the crew box makes the max 10.
    const out = await applyStress(r, { characterId: 'c1', userId: 'u1', stress: 3 });
    expect(out.success && out.data?.trauma).toBe(false);
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({ stress: 9 }),
    });
  });

  it('marking the LAST stress box → stress 0, one trauma owed, and a feed note (RAW)', async () => {
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const create = vi.fn().mockResolvedValue(ok({ id: 'n1' }));
    const r = repos({
      rolls: { create },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(CHARACTER)) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    // 6 + 5 overflows the default 9-stress track — no silent clamp to 9.
    const out = await applyStress(r, {
      characterId: 'c1',
      userId: 'u1',
      stress: 5,
      traumaLog: { note: n => `${n} broke`, retireNote: n => `${n} retires` },
    });
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({ stress: 0, traumaPending: 1 }),
    });
    expect(out.success && out.data).toMatchObject({ trauma: true, mustRetire: false });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ kind: 'note', label: 'Silks', note: 'Silks broke' })
    );
  });

  it('the trauma that fills the trauma track also logs the retirement prompt', async () => {
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const create = vi.fn().mockResolvedValue(ok({ id: 'n1' }));
    const scarred = {
      ...CHARACTER,
      characterData: {
        ...CHARACTER.characterData,
        stress: 8,
        trauma: DEFAULT_RULESET.traumaConditions!.slice(0, 3),
      },
    } as CharacterWithDetails;
    const r = repos({
      rolls: { create },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(scarred)) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    const out = await applyStress(r, {
      characterId: 'c1',
      userId: 'u1',
      stress: 2,
      traumaLog: { note: n => `${n} broke`, retireNote: n => `${n} retires` },
    });
    expect(out.success && out.data?.mustRetire).toBe(true);
    expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ note: 'Silks retires' }));
  });

  it('is a no-op success for zero cost and for a clear at 0', async () => {
    const update = vi.fn();
    const calm = {
      ...CHARACTER,
      characterData: { ...CHARACTER.characterData, stress: 0 },
    } as CharacterWithDetails;
    const r = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(calm)) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    expect(await applyStress(r, { characterId: 'c1', userId: 'u1', stress: 0 })).toEqual(ok(null));
    expect(await applyStress(r, { characterId: 'c1', userId: 'u1', stress: -3 })).toEqual(ok(null));
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
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({
      rolls: { create },
      characterManagement: { updateCharacterWithValidation: update },
    });
    const out = await rollResistance(r, {
      gameId: 'g1',
      userId: 'u1',
      characterId: 'c1',
      dice: 2,
      results: [6, 3],
      zeroDice: false,
      note: 'Includes +1d from an ability or upgrade.',
    });
    expect(out.success && out.data.stress).toBe(0);
    expect(update).not.toHaveBeenCalled();
    // An ability's bonus dice persist as the roll's note (round 4 — web/bot parity).
    expect(create).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ note: 'Includes +1d from an ability or upgrade.' })
    );
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
    // 6 + 5 overflows the default 9-stress track → trauma: stress resets, a condition is owed.
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({ stress: 0, traumaPending: 1 }),
    });
    expect(out.success && out.data.trauma).toBe(true);
  });
});

describe('chooseTrauma', () => {
  const owing = {
    ...CHARACTER,
    ruleset: { content: DEFAULT_RULESET },
    characterData: { ...CHARACTER.characterData, stress: 0, traumaPending: 1 },
  } as unknown as CharacterWithDetails;
  const condition = DEFAULT_RULESET.traumaConditions![0]!;

  it('marks the chosen ruleset condition, clears the debt, and logs it', async () => {
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const create = vi.fn().mockResolvedValue(ok({ id: 'n1' }));
    const r = repos({
      rolls: { create },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(owing)) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    const out = await chooseTrauma(r, {
      characterId: 'c1',
      userId: 'u1',
      condition,
      logNote: 'picked',
      retireNote: 'retire',
    });
    expect(out.success && out.data.mustRetire).toBe(false);
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({ trauma: [condition], traumaPending: 0 }),
    });
    expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ note: 'picked' }));
  });

  it("lets the campaign's GM pick the condition on a player's sheet (owner-or-GM)", async () => {
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const asGm = { ...owing, createdBy: 'player-1', game: { createdBy: 'gm-1' } };
    const r = repos({
      rolls: { create: vi.fn().mockResolvedValue(ok({ id: 'n1' })) },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(asGm)) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    const out = await chooseTrauma(r, {
      characterId: 'c1',
      userId: 'gm-1',
      condition,
      logNote: 'picked',
      retireNote: 'retire',
    });
    expect(out.success).toBe(true);
    expect(update).toHaveBeenCalled();
  });

  it('refuses when nothing is owed, or the condition is not in the ruleset list', async () => {
    const r = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(owing)) },
      characterManagement: { updateCharacterWithValidation: vi.fn() },
    });
    const bad = await chooseTrauma(r, {
      characterId: 'c1',
      userId: 'u1',
      condition: 'Grumpy',
      logNote: 'x',
      retireNote: 'y',
    });
    expect(!bad.success && bad.error.code).toBe('INVALID_TRAUMA');
    const none = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(CHARACTER)) },
    });
    const out = await chooseTrauma(none, {
      characterId: 'c1',
      userId: 'u1',
      condition,
      logNote: 'x',
      retireNote: 'y',
    });
    expect(!out.success && out.error.code).toBe('NO_TRAUMA_PENDING');
  });
});

describe('rollAction — assist (F10)', () => {
  const baseInput = {
    gameId: 'g1',
    userId: 'u1',
    characterId: 'c1',
    kind: 'action' as const,
    label: 'skirmish',
    dice: 3,
    results: [6, 4, 2],
    zeroDice: false,
  };

  it('charges the assister 1 stress when the roller may write them (own alt / GM)', async () => {
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const helper = { ...CHARACTER, id: 'c2', createdBy: 'u1' } as CharacterWithDetails;
    const r = repos({
      rolls: { create },
      characters: {
        findWithDetails: vi.fn((id: string) =>
          Promise.resolve(ok(id === 'c2' ? helper : CHARACTER))
        ),
      },
      characterManagement: { updateCharacterWithValidation: update },
    });
    const out = await rollAction(r, { ...baseInput, assist: { characterId: 'c2' } });
    expect(out.success).toBe(true);
    // helper sits at stress 6 → +1 = 7.
    expect(update).toHaveBeenCalledWith('c2', 'u1', {
      characterData: expect.objectContaining({ stress: 7 }),
    });
    expect(out.success && out.data.assist).toEqual({
      characterId: 'c2',
      status: 'charged',
      trauma: false,
    });
  });

  it('an own/GM assist charge is logged with the client copy, like the cross-player one', async () => {
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const helper = {
      ...CHARACTER,
      id: 'c2',
      createdBy: 'u1',
      gameId: 'g1',
    } as CharacterWithDetails;
    const r = repos({
      rolls: { create },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(helper)) },
      characterManagement: {
        updateCharacterWithValidation: vi
          .fn()
          .mockResolvedValue(ok({ id: 'c2', name: 'Bo', gameId: 'g1' } as Character)),
      },
    });
    await rollAction(r, {
      ...baseInput,
      assist: { characterId: 'c2', logNote: 'Bo marked 1 stress for an assist.' },
    });
    expect(create).toHaveBeenLastCalledWith(
      'u1',
      expect.objectContaining({
        kind: 'note',
        characterId: 'c2',
        note: 'Bo marked 1 stress for an assist.',
      })
    );
  });

  it("another player's assister goes through the narrow 00027 charge, never a plain write", async () => {
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const update = vi.fn();
    const chargeAssistStress = vi.fn().mockResolvedValue(ok('charged'));
    const foreign = { ...CHARACTER, id: 'c9', createdBy: 'u9' } as CharacterWithDetails;
    const r = repos({
      rolls: { create, chargeAssistStress },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(foreign)) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    const out = await rollAction(r, {
      ...baseInput,
      assist: { characterId: 'c9', logNote: 'Bo marked 1 stress for the assist' },
    });
    expect(out.success && out.data.assist).toEqual({ characterId: 'c9', status: 'charged' });
    expect(chargeAssistStress).toHaveBeenCalledWith(
      'r1',
      'c9',
      'Bo marked 1 stress for the assist'
    );
    expect(update).not.toHaveBeenCalled(); // RLS boundary: no direct write to their row
  });

  it('an assister one box from trauma is held back (near_limit) — the roll still stands', async () => {
    const foreign = { ...CHARACTER, id: 'c9', createdBy: 'u9' } as CharacterWithDetails;
    const r = repos({
      rolls: {
        create: vi.fn().mockResolvedValue(ok({ id: 'r1' })),
        chargeAssistStress: vi.fn().mockResolvedValue(ok('near_limit')),
      },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(foreign)) },
    });
    const out = await rollAction(r, { ...baseInput, assist: { characterId: 'c9' } });
    expect(out.success && out.data.assist).toEqual({ characterId: 'c9', status: 'near_limit' });
  });

  it('a failed assist charge is reported with the saved roll, not as the roll failing', async () => {
    const foreign = { ...CHARACTER, id: 'c9', createdBy: 'u9' } as CharacterWithDetails;
    const r = repos({
      rolls: {
        create: vi.fn().mockResolvedValue(ok({ id: 'r1' })),
        chargeAssistStress: vi.fn().mockResolvedValue(fail('That roll is too old')),
      },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(foreign)) },
    });
    const out = await rollAction(r, { ...baseInput, assist: { characterId: 'c9' } });
    expect(out.success).toBe(true);
    expect(out.success && out.data.assist).toEqual({
      characterId: 'c9',
      status: 'failed',
      error: 'That roll is too old',
    });
    // A non-ownership failure of the plain write is reported the same way.
    const own = { ...CHARACTER, id: 'c2', createdBy: 'u1' } as CharacterWithDetails;
    const r2 = repos({
      rolls: { create: vi.fn().mockResolvedValue(ok({ id: 'r2' })) },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(own)) },
      characterManagement: {
        updateCharacterWithValidation: vi.fn().mockResolvedValue(fail('Load exceeds 5')),
      },
    });
    const out2 = await rollAction(r2, { ...baseInput, assist: { characterId: 'c2' } });
    expect(out2.success && out2.data.assist).toMatchObject({
      status: 'failed',
      error: 'Load exceeds 5',
    });
  });
});

describe('rollAction — desperate XP lands in the campaign log (round 5 P2-8)', () => {
  it('logs an xp event on the rolling character with the client copy', async () => {
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const inGame = {
      ...CHARACTER,
      gameId: 'g1',
      ruleset: { content: getBuiltinById('blades-in-the-dark')?.content ?? DEFAULT_RULESET },
    } as unknown as CharacterWithDetails;
    const r = repos({
      rolls: { create },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(inGame)) },
      characterManagement: {
        updateCharacterWithValidation: vi.fn().mockResolvedValue(ok({} as Character)),
      },
    });
    const action = 'Skirmish';
    const out = await rollAction(r, {
      gameId: 'g1',
      userId: 'u1',
      characterId: 'c1',
      kind: 'action',
      label: action,
      action,
      position: 'desperate',
      dice: 1,
      results: [3],
      zeroDice: false,
      desperateXpLog: (track, amount) => `Desperate roll — marked ${amount} XP in ${track}`,
    });
    expect(out.success && out.data.desperateXp?.amount).toBe(1);
    expect(create).toHaveBeenLastCalledWith(
      'u1',
      expect.objectContaining({
        kind: 'xp',
        characterId: 'c1',
        label: 'Silks',
        note: 'Desperate roll — marked 1 XP in prowess',
      })
    );
  });

  it('logs nothing without copy (the bot and older callers stay unchanged)', async () => {
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const inGame = {
      ...CHARACTER,
      gameId: 'g1',
      ruleset: { content: getBuiltinById('blades-in-the-dark')?.content ?? DEFAULT_RULESET },
    } as unknown as CharacterWithDetails;
    const r = repos({
      rolls: { create },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(inGame)) },
      characterManagement: {
        updateCharacterWithValidation: vi.fn().mockResolvedValue(ok({} as Character)),
      },
    });
    const action = 'Skirmish';
    await rollAction(r, {
      gameId: 'g1',
      userId: 'u1',
      characterId: 'c1',
      kind: 'action',
      label: action,
      action,
      position: 'desperate',
      dice: 1,
      results: [3],
      zeroDice: false,
    });
    expect(create).toHaveBeenCalledTimes(1); // the roll only
  });
});

describe('rollAction / rollResistance — a stress write failure never fails a saved roll (P2-5)', () => {
  it('push: the roll is returned with stressError', async () => {
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1', outcome: 'success' }));
    const r = repos({
      rolls: { create },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(CHARACTER)) },
      characterManagement: {
        updateCharacterWithValidation: vi.fn().mockResolvedValue(fail('Carrying 7 load')),
      },
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
    expect(out.success && out.data).toMatchObject({
      id: 'r1',
      pushStress: null,
      stressError: 'Carrying 7 load',
      assist: null,
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('resistance: the roll is returned with stressError', async () => {
    const r = repos({
      rolls: { create: vi.fn().mockResolvedValue(ok({ id: 'r1' })) },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(CHARACTER)) },
      characterManagement: {
        updateCharacterWithValidation: vi.fn().mockResolvedValue(fail('Carrying 7 load')),
      },
    });
    const out = await rollResistance(r, {
      gameId: 'g1',
      userId: 'u1',
      characterId: 'c1',
      dice: 2,
      results: [4, 2],
      zeroDice: false,
    });
    expect(out.success && out.data).toMatchObject({
      stress: 2,
      trauma: false,
      stressError: 'Carrying 7 load',
    });
  });

  // Codex P2 (PR #182): the trauma FEED note failing after the stress + owed trauma were written
  // is not an unapplied stress — the outcome stays applied and only `logError` reports the gap.
  const atEight = {
    ...CHARACTER,
    gameId: 'g1',
    characterData: { ...CHARACTER.characterData, stress: 8 },
  } as CharacterWithDetails;
  const feedFails = () => {
    const update = vi.fn().mockResolvedValue(ok({ id: 'c1' } as Character));
    // The roll row lands; the trauma note insert after it fails.
    const create = vi
      .fn()
      .mockResolvedValueOnce(ok({ id: 'r1' }))
      .mockResolvedValue(fail('feed insert refused'));
    return {
      update,
      r: repos({
        rolls: { create },
        characters: { findWithDetails: vi.fn().mockResolvedValue(ok(atEight)) },
        characterManagement: { updateCharacterWithValidation: update },
      }),
    };
  };
  const TRAUMA_COPY = {
    note: (n: string) => `${n} broke`,
    retireNote: (n: string) => `${n} retires`,
  };

  it('push into trauma with a failed feed note: applied (trauma kept), logError, no stressError', async () => {
    const { r, update } = feedFails();
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
      traumaLog: TRAUMA_COPY,
    });
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({ stress: 0, traumaPending: 1 }),
    });
    expect(out.success && out.data.stressError).toBeNull();
    expect(out.success && out.data.pushStress).toMatchObject({
      trauma: true,
      logError: 'feed insert refused',
    });
  });

  it('resistance into trauma with a failed feed note: trauma flags kept, logError, no stressError', async () => {
    const { r } = feedFails();
    const out = await rollResistance(r, {
      gameId: 'g1',
      userId: 'u1',
      characterId: 'c1',
      dice: 1,
      results: [3], // 3 stress: 8 → overflow
      zeroDice: false,
      traumaLog: TRAUMA_COPY,
    });
    expect(out.success && out.data).toMatchObject({
      stress: 3,
      trauma: true,
      stressError: null,
      logError: 'feed insert refused',
    });
  });

  it('resistance whose stress write itself fails: stressError, no trauma claimed', async () => {
    const r = repos({
      rolls: { create: vi.fn().mockResolvedValue(ok({ id: 'r1' })) },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(atEight)) },
      characterManagement: {
        updateCharacterWithValidation: vi.fn().mockResolvedValue(fail('Carrying 7 load')),
      },
    });
    const out = await rollResistance(r, {
      gameId: 'g1',
      userId: 'u1',
      characterId: 'c1',
      dice: 1,
      results: [3],
      zeroDice: false,
      traumaLog: TRAUMA_COPY,
    });
    expect(out.success && out.data).toMatchObject({
      trauma: false,
      stressError: 'Carrying 7 load',
      logError: null,
    });
  });

  it('applyStress: a failed trauma feed note keeps the applied outcome (no double charge)', async () => {
    const r = repos({
      rolls: { create: vi.fn().mockResolvedValue(fail('feed insert refused')) },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(atEight)) },
      characterManagement: {
        updateCharacterWithValidation: vi.fn().mockResolvedValue(ok({ id: 'c1' } as Character)),
      },
    });
    const out = await applyStress(r, {
      characterId: 'c1',
      userId: 'u1',
      stress: 2,
      traumaLog: TRAUMA_COPY,
    });
    expect(out.success).toBe(true);
    expect(out.success && out.data).toMatchObject({
      trauma: true,
      logError: 'feed insert refused',
    });
  });

  it('a clean push reports no stressError', async () => {
    const r = repos({
      rolls: { create: vi.fn().mockResolvedValue(ok({ id: 'r1' })) },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(CHARACTER)) },
      characterManagement: {
        updateCharacterWithValidation: vi.fn().mockResolvedValue(ok({} as Character)),
      },
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
    expect(out.success && out.data.stressError).toBeNull();
  });
});

describe('flashback (F16)', () => {
  it('charges the priced stress (clamped) and logs the note to the feed', async () => {
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(CHARACTER)) },
      characterManagement: { updateCharacterWithValidation: update },
      rolls: { create },
    });
    const out = await flashback(r, {
      character: CHARACTER,
      userId: 'u1',
      stress: 2,
      logLabel: 'Silks',
      logNote: 'Flashback (2 stress): bribed the doorman yesterday',
    });
    expect(out.success).toBe(true);
    // 6 + 2 = 8 on the default 9-track.
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({ stress: 8 }),
    });
    expect(create).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        kind: 'note',
        note: 'Flashback (2 stress): bribed the doorman yesterday',
      })
    );
  });

  it('a FREE flashback (0 stress) only logs; a stranger is refused', async () => {
    const update = vi.fn();
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({
      characterManagement: { updateCharacterWithValidation: update },
      rolls: { create },
    });
    const out = await flashback(r, {
      character: CHARACTER,
      userId: 'u1',
      stress: 0,
      logLabel: 'Silks',
      logNote: 'Flashback: cased the vault',
    });
    expect(out.success).toBe(true);
    expect(update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalled();

    const refused = await flashback(r, {
      character: CHARACTER,
      userId: 'someone-else',
      stress: 0,
      logLabel: 'l',
      logNote: 'n',
    });
    expect(refused.success).toBe(false);
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
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(CHARACTER)) },
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
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(standalone)) },
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

  it('refuses NO_VICE (no write, no log) until the character has a vice', async () => {
    const update = vi.fn();
    const create = vi.fn();
    const noVice = {
      ...CHARACTER,
      characterData: { ...CHARACTER.characterData, vice: '  ' },
    } as CharacterWithDetails;
    const r = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(noVice)) },
      characterManagement: { updateCharacterWithValidation: update },
      rolls: { create },
    });
    const out = await indulgeVice(r, {
      character: noVice,
      userId: 'u1',
      results: [4],
      zeroDice: false,
      logLabel: 'x',
    });
    expect(out.success ? null : out.error.code).toBe('NO_VICE');
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});

describe('rollAction — desperate-roll XP (BitD: the rolled action’s attribute)', () => {
  // Real BitD content (fixture provenance): Skirmish belongs to Prowess.
  const BITD = getBuiltinById('blades-in-the-dark')?.content ?? DEFAULT_RULESET;
  const bitdChar = (xp?: { playbook: number; attributes: Record<string, number> }) =>
    ({
      ...CHARACTER,
      ruleset: { content: BITD },
      characterData: { ...CHARACTER.characterData, ...(xp ? { xp } : {}) },
    }) as unknown as CharacterWithDetails;
  const roll = {
    gameId: 'g1',
    userId: 'u1',
    characterId: 'c1',
    kind: 'action' as const,
    label: 'Skirmish',
    action: 'Skirmish',
    dice: 2,
    results: [3, 2],
    zeroDice: false,
  };

  it('a desperate action roll marks 1 xp in the action’s ATTRIBUTE track (not playbook)', async () => {
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const r = repos({
      rolls: { create: vi.fn().mockResolvedValue(ok({ id: 'r1' })) },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(bitdChar())) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    const out = await rollAction(r, { ...roll, position: 'desperate' });
    expect(out.success && out.data.desperateXp).toEqual({ track: 'prowess', amount: 1, marks: 1 });
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({
        xp: { playbook: 0, attributes: { prowess: 1 } },
      }),
    });
  });

  it('markDesperateRollXp marks the same attribute XP with no roll persisted (standalone, F96)', async () => {
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const create = vi.fn();
    const r = repos({
      rolls: { create },
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(bitdChar())) },
      characterManagement: { updateCharacterWithValidation: update },
    });
    const out = await markDesperateRollXp(r, {
      characterId: 'c1',
      userId: 'u1',
      action: 'Skirmish',
    });
    expect(out.success && out.data).toEqual({ track: 'prowess', amount: 1, marks: 1 });
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({ xp: { playbook: 0, attributes: { prowess: 1 } } }),
    });
  });

  it('marks nothing on a risky roll, a full track, or someone else’s character', async () => {
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const risky = await rollAction(
      repos({
        rolls: { create },
        characters: { findWithDetails: vi.fn().mockResolvedValue(ok(bitdChar())) },
        characterManagement: { updateCharacterWithValidation: update },
      }),
      { ...roll, position: 'risky' }
    );
    expect(risky.success && risky.data.desperateXp).toBeNull();
    const full = await rollAction(
      repos({
        rolls: { create },
        characters: {
          findWithDetails: vi
            .fn()
            .mockResolvedValue(ok(bitdChar({ playbook: 0, attributes: { prowess: 6 } }))),
        },
        characterManagement: { updateCharacterWithValidation: update },
      }),
      { ...roll, position: 'desperate' }
    );
    // Round 4: a full track marks nothing but SAYS so (track full → take an advance).
    expect(full.success && full.data.desperateXp).toEqual({
      track: 'prowess',
      amount: 0,
      marks: 6,
      trackFull: true,
    });
    const other = await rollAction(
      repos({
        rolls: { create },
        characters: { findWithDetails: vi.fn().mockResolvedValue(ok(bitdChar())) },
        characterManagement: { updateCharacterWithValidation: update },
      }),
      { ...roll, userId: 'someone-else', position: 'desperate' }
    );
    expect(other.success && other.data.desperateXp).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it('a failed XP write never turns the saved roll into a failure (round 4 P2-N4)', async () => {
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1', outcome: 'partial' }));
    const update = vi.fn().mockResolvedValue({
      success: false,
      error: { message: 'Carrying 7 load exceeds…', code: 'LOAD_OVER' },
    });
    const out = await rollAction(
      repos({
        rolls: { create },
        characters: { findWithDetails: vi.fn().mockResolvedValue(ok(bitdChar())) },
        characterManagement: { updateCharacterWithValidation: update },
      }),
      { ...roll, position: 'desperate' }
    );
    expect(out.success).toBe(true);
    expect(out.success && out.data.id).toBe('r1');
    expect(out.success && out.data.desperateXp).toBeNull();
    expect(out.success && out.data.desperateXpError).toMatch(/load/);
    // A lookup failure is reported the same way; a clean roll reports no error.
    const lookup = await rollAction(
      repos({
        rolls: { create },
        characters: {
          findWithDetails: vi.fn().mockResolvedValue({ success: false, error: { message: '' } }),
        },
      }),
      { ...roll, position: 'desperate' }
    );
    expect(lookup.success && lookup.data.desperateXpError).toBe('XP not marked');
    const risky = await rollAction(repos({ rolls: { create } }), { ...roll, position: 'risky' });
    expect(risky.success && risky.data.desperateXpError).toBeNull();
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
    const r = repos({
      characters: { update, findById: vi.fn().mockResolvedValue(ok(withCoin)) },
      rolls: { create },
    });
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
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(CHARACTER)) },
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
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(standalone)) },
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

  it('advanceCrewTier (strong hold) pays new Tier × 8 coin → Tier +1, rep 0, hold weak; logs', async () => {
    const update = vi.fn().mockResolvedValue(ok(CREW));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({ crews: { update }, rolls: { create } });
    const crew = { ...CREW, rep: 12, hold: 'strong', coin: 10, vault: 8, claims: [] } as Crew;
    const note = vi.fn(() => 'n');
    await advanceCrewTier(r, { crew, userId: 'u1', logLabel: 'l', logNote: note });
    // New Tier 2 costs 16: 10 from coin, 6 from the vault.
    expect(update).toHaveBeenCalledWith('cr1', {
      tier: 2,
      rep: 0,
      hold: 'weak',
      coin: 0,
      vault: 2,
    });
    expect(note).toHaveBeenCalledWith({ kind: 'tier', tier: 2, cost: 16 });
    expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ kind: 'crew' }));
  });

  it('advanceCrewTier (weak hold) turns hold strong for free; Patron halves a Tier cost', async () => {
    const update = vi.fn().mockResolvedValue(ok(CREW));
    const r = repos({ crews: { update }, rolls: { create: vi.fn().mockResolvedValue(ok({})) } });
    const weak = { ...CREW, rep: 12, hold: 'weak', coin: 0, vault: 0, claims: [] } as Crew;
    await advanceCrewTier(r, { crew: weak, userId: 'u1', logLabel: 'l', logNote: () => 'n' });
    expect(update).toHaveBeenCalledWith('cr1', {
      tier: 1,
      rep: 0,
      hold: 'strong',
      coin: 0,
      vault: 0,
    });
    const patron = {
      ...CREW,
      rep: 12,
      hold: 'strong',
      coin: 8,
      vault: 0,
      claims: [],
      crewAbilities: ['patron'],
    } as Crew;
    const content = {
      crew: {
        types: [],
        abilities: [
          { id: 'patron', name: 'Patron', description: '', effects: { halfTierCost: true } },
        ],
      },
    };
    await advanceCrewTier(r, {
      crew: patron,
      content,
      userId: 'u1',
      logLabel: 'l',
      logNote: () => 'n',
    });
    expect(update).toHaveBeenLastCalledWith('cr1', expect.objectContaining({ tier: 2, coin: 0 }));
  });

  it('advanceCrewTier refuses (no write, no log) when rep isn’t full or coin is short', async () => {
    const update = vi.fn();
    const create = vi.fn();
    const r = repos({ crews: { update }, rolls: { create } });
    const short = { ...CREW, rep: 12, hold: 'strong', coin: 3, vault: 0, claims: [] } as Crew;
    const out = await advanceCrewTier(r, {
      crew: short,
      userId: 'u1',
      logLabel: 'l',
      logNote: () => 'n',
    });
    expect(!out.success && out.error.code).toBe('INSUFFICIENT_COIN');
    const notFull = { ...short, rep: 5 } as Crew;
    const out2 = await advanceCrewTier(r, {
      crew: notFull,
      userId: 'u1',
      logLabel: 'l',
      logNote: () => 'n',
    });
    expect(!out2.success && out2.error.code).toBe('REP_NOT_FULL');
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('applyCrewHeat with a negative amount reduces heat (never below 0, Wanted untouched)', async () => {
    const update = vi.fn().mockResolvedValue(ok(CREW));
    const r = repos({ crews: { update }, rolls: { create: vi.fn().mockResolvedValue(ok({})) } });
    await applyCrewHeat(r, { crew: CREW, userId: 'u1', amount: -3, logLabel: 'l', logNote: 'n' });
    expect(update).toHaveBeenCalledWith('cr1', { heat: 5, wanted: 2 });
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

  it('markCrewXp sets the advancement track (clamped) and logs a crew event', async () => {
    const update = vi.fn().mockResolvedValue(ok(CREW));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({ crews: { update }, rolls: { create } });
    const out = await markCrewXp(r, {
      crew: { ...CREW, resources: { 'crew-xp': 3 } } as unknown as Crew,
      userId: 'u1',
      xp: 5,
      logLabel: 'Crew',
      logNote: 'xp 5/8',
    });
    expect(out.success).toBe(true);
    expect(update).toHaveBeenCalledWith('cr1', { resources: { 'crew-xp': 5 } });
    expect(create).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ gameId: 'g1', kind: 'crew', note: 'xp 5/8' })
    );
  });

  // Real BitD content (F69 fixture provenance): a Shadows crew's own list + the crew Veteran.
  const BITD = getBuiltinById('blades-in-the-dark')?.content ?? DEFAULT_RULESET;
  const SHADOWS = {
    ...CREW,
    crewType: 'shadows',
    crewAbilities: ['crew-second-story'],
    resources: { 'crew-xp': 8 },
  } as unknown as Crew;

  it('takeCrewAdvance spends a FULL track on an own-list ability (one write: ability + reset) and logs', async () => {
    const update = vi.fn().mockResolvedValue(ok(CREW));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({ crews: { update }, rolls: { create } });
    const logNote = vi.fn().mockReturnValue('took Pack Rats');
    const out = await takeCrewAdvance(r, {
      crew: SHADOWS,
      content: BITD,
      choice: { kind: 'ability', abilityId: 'crew-network' },
      userId: 'u1',
      logLabel: 'l',
      logNote,
    });
    expect(out.success).toBe(true);
    expect(update).toHaveBeenCalledWith('cr1', {
      crewAbilities: ['crew-second-story', 'crew-network'],
      resources: { 'crew-xp': 0 },
    });
    expect(logNote).toHaveBeenCalledWith(expect.objectContaining({ added: ['crew-network'] }));
    expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ note: 'took Pack Rats' }));
  });

  it('takeCrewAdvance refuses (no write, no log) a non-full track, another type’s ability without a slot, and Mastery as an ability', async () => {
    const update = vi.fn();
    const create = vi.fn();
    const r = repos({ crews: { update }, rolls: { create } });
    const base = { userId: 'u1', logLabel: 'l', logNote: () => 'n', content: BITD };
    const notFull = await takeCrewAdvance(r, {
      ...base,
      crew: { ...SHADOWS, resources: { 'crew-xp': 7 } } as Crew,
      choice: { kind: 'ability', abilityId: 'crew-network' },
    });
    expect(notFull.success).toBe(false);
    expect(notFull.success ? null : notFull.error.code).toBe('TRACK_NOT_FULL');
    // Deadly is the Assassins'. All three crew Veteran takes are held and each slot is already
    // spent on another Assassins ability — nothing can open a fourth.
    const crossNoGate = await takeCrewAdvance(r, {
      ...base,
      crew: {
        ...SHADOWS,
        crewAbilities: [
          'crew-second-story',
          'crew-veteran',
          'crew-death-veil',
          'crew-veteran-2',
          'crew-predators',
          'crew-veteran-3',
          'crew-no-traces',
        ],
      } as Crew,
      choice: { kind: 'ability', abilityId: 'crew-deadly' },
    });
    expect(crossNoGate.success ? null : crossNoGate.error.code).toBe('ABILITY_LOCKED');
    const mastery = await takeCrewAdvance(r, {
      ...base,
      crew: SHADOWS,
      choice: { kind: 'ability', abilityId: 'crew-mastery' },
    });
    expect(mastery.success ? null : mastery.error.code).toBe('ABILITY_LOCKED');
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('takeCrewAdvance takes Veteran WITH another type’s ability in one advance', async () => {
    const update = vi.fn().mockResolvedValue(ok(CREW));
    const r = repos({ crews: { update }, rolls: { create: vi.fn().mockResolvedValue(ok({})) } });
    const out = await takeCrewAdvance(r, {
      crew: SHADOWS,
      content: BITD,
      choice: { kind: 'ability', abilityId: 'crew-deadly' },
      userId: 'u1',
      logLabel: 'l',
      logNote: () => 'n',
    });
    expect(out.success).toBe(true);
    expect(update).toHaveBeenCalledWith('cr1', {
      crewAbilities: ['crew-second-story', 'crew-veteran', 'crew-deadly'],
      resources: { 'crew-xp': 0 },
    });
  });

  it('takeCrewAdvance marks two Mastery boxes per advance and grants it at four', async () => {
    const update = vi.fn().mockResolvedValue(ok(CREW));
    const r = repos({ crews: { update }, rolls: { create: vi.fn().mockResolvedValue(ok({})) } });
    const base = { userId: 'u1', logLabel: 'l', logNote: () => 'n', content: BITD };
    await takeCrewAdvance(r, {
      ...base,
      crew: SHADOWS,
      choice: { kind: 'upgrades', upgradeId: 'crew-mastery' },
    });
    expect(update).toHaveBeenLastCalledWith('cr1', {
      crewAbilities: ['crew-second-story'],
      resources: { 'crew-xp': 0, 'crew-upgrade:crew-mastery': 2 },
    });
    await takeCrewAdvance(r, {
      ...base,
      crew: { ...SHADOWS, resources: { 'crew-xp': 8, 'crew-upgrade:crew-mastery': 2 } } as Crew,
      choice: { kind: 'upgrades', upgradeId: 'crew-mastery' },
    });
    expect(update).toHaveBeenLastCalledWith('cr1', {
      crewAbilities: ['crew-second-story', 'crew-mastery'],
      resources: { 'crew-xp': 0 },
    });
  });

  it('takeCrewAdvance gives a brand-new crew its starting ability free (track untouched)', async () => {
    const update = vi.fn().mockResolvedValue(ok(CREW));
    const r = repos({ crews: { update }, rolls: { create: vi.fn().mockResolvedValue(ok({})) } });
    const out = await takeCrewAdvance(r, {
      crew: { ...SHADOWS, crewAbilities: [], resources: {} } as Crew,
      content: BITD,
      choice: { kind: 'ability', abilityId: 'crew-second-story' },
      userId: 'u1',
      logLabel: 'l',
      logNote: p => (p.startingPick ? 'starting' : 'advance'),
    });
    expect(out.success).toBe(true);
    expect(update).toHaveBeenCalledWith('cr1', {
      crewAbilities: ['crew-second-story'],
      // The free pick records itself (round 4) so removing the ability can't re-open it.
      resources: { 'crew-starting-pick': 1 },
    });
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

  it('markXp on a FLAT-pool ruleset banks experience_points and logs an xp event', async () => {
    // The bare CHARACTER fixture's content has no xpTracks → flat mode.
    const addExperience = vi.fn().mockResolvedValue(ok({ id: 'c1', gameId: 'g1' } as Character));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({
      characters: { addExperience, findWithDetails: vi.fn().mockResolvedValue(ok(CHARACTER)) },
      rolls: { create },
    });
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
    const standalone = { ...CHARACTER, gameId: null } as CharacterWithDetails;
    const addExperience = vi.fn().mockResolvedValue(ok({ id: 'c1', gameId: null } as Character));
    const create = vi.fn();
    const r = repos({
      characters: { addExperience, findWithDetails: vi.fn().mockResolvedValue(ok(standalone)) },
      rolls: { create },
    });
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

  // ----- track mode (audit P1) — on the REAL shipped default ruleset, not invented content ----
  describe('markXp — track mode', () => {
    const TRACK_CHARACTER = {
      ...CHARACTER,
      ruleset: { content: DEFAULT_RULESET },
    } as unknown as CharacterWithDetails;
    const attribute = DEFAULT_RULESET.attributes[0]!;

    const trackRepos = (character: CharacterWithDetails) => {
      const update = vi
        .fn()
        .mockImplementation((_id, _uid, data: { characterData: unknown }) =>
          Promise.resolve(ok({ ...character, characterData: data.characterData } as Character))
        );
      const addExperience = vi.fn();
      const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
      const r = repos({
        characters: { addExperience, findWithDetails: vi.fn().mockResolvedValue(ok(character)) },
        characterManagement: { updateCharacterWithValidation: update },
        rolls: { create },
      });
      return { r, update, addExperience, create };
    };

    it('marks the PLAYBOOK track by default — the store advanceCharacter actually gates on', async () => {
      const { r, update, addExperience, create } = trackRepos(TRACK_CHARACTER);
      const out = await markXp(r, {
        characterId: 'c1',
        userId: 'u1',
        amount: 1,
        reason: 'x',
        logLabel: 'Silks',
        logNote: 'Marked 1 XP',
      });
      expect(out.success).toBe(true);
      expect(addExperience).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith('c1', 'u1', {
        characterData: expect.objectContaining({
          xp: expect.objectContaining({ playbook: 1 }),
        }),
      });
      expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ kind: 'xp' }));
    });

    it('marks an attribute track when asked, clamped to the track size', async () => {
      const size = xpTrackSize(DEFAULT_RULESET, attribute.id);
      const nearFull = {
        ...TRACK_CHARACTER,
        characterData: {
          ...TRACK_CHARACTER.characterData,
          xp: { playbook: 0, attributes: { [attribute.id]: size - 1 } },
        },
      } as unknown as CharacterWithDetails;
      const { r, update } = trackRepos(nearFull);
      const out = await markXp(r, {
        characterId: 'c1',
        userId: 'u1',
        amount: 5, // overshoots — markXpTrack clamps at the track size
        reason: 'x',
        track: attribute.id,
        logLabel: 'x',
        logNote: 'x',
      });
      expect(out.success).toBe(true);
      expect(update).toHaveBeenCalledWith('c1', 'u1', {
        characterData: expect.objectContaining({
          xp: expect.objectContaining({ attributes: { [attribute.id]: size } }),
        }),
      });
    });
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
const levelNote = (level: string | null) => `took ${level ?? 'nothing'}`;

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

describe('takeHarm — spend armor (F44)', () => {
  // Real ruleset content (fixture provenance): DEFAULT_RULESET ships 'armor' + 'heavy-armor'.
  const armored = (loadout: { items: string[]; armorSpent?: string[] }) =>
    ({
      ...CHARACTER,
      ruleset: { content: DEFAULT_RULESET },
      characterData: {
        ...CHARACTER.characterData,
        loadout: { level: 'normal', ...loadout },
      },
    }) as unknown as CharacterWithDetails;
  const armorNote = (level: string | null) => (level === null ? 'absorbed' : `took ${level}`);

  it('lesser + armor → absorbed outright: armor marked spent, NO harm entry, feed logged', async () => {
    const update = vi.fn().mockResolvedValue(ok({ id: 'c1' } as Character));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(armored({ items: ['armor'] }))) },
      characterManagement: { updateCharacterWithValidation: update },
      rolls: { create },
    });
    const out = await takeHarm(r, {
      characterId: 'c1',
      userId: 'u1',
      level: 'lesser',
      description: 'Grazed',
      spendArmor: true,
      logLabel: 'Silks',
      logNote: armorNote,
    });
    expect(out.success).toBe(true);
    if (out.success) expect(out.data.appliedLevel).toBeNull();
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({
        loadout: expect.objectContaining({ armorSpent: ['armor'] }),
        harm: { lesser: [], moderate: [], severe: [] },
      }),
    });
    expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ note: 'absorbed' }));
  });

  it('moderate + armor → lands one level lighter (lesser) with the armor spent', async () => {
    const update = vi.fn().mockResolvedValue(ok({ id: 'c1' } as Character));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({
      characters: { findWithDetails: vi.fn().mockResolvedValue(ok(armored({ items: ['armor'] }))) },
      characterManagement: { updateCharacterWithValidation: update },
      rolls: { create },
    });
    const out = await takeHarm(r, {
      characterId: 'c1',
      userId: 'u1',
      level: 'moderate',
      description: 'Slashed',
      spendArmor: true,
      logLabel: 'Silks',
      logNote: armorNote,
    });
    expect(out.success).toBe(true);
    if (out.success) expect(out.data.appliedLevel).toBe('lesser');
    expect(update).toHaveBeenCalledWith('c1', 'u1', {
      characterData: expect.objectContaining({
        loadout: expect.objectContaining({ armorSpent: ['armor'] }),
        harm: expect.objectContaining({ lesser: ['Slashed'] }),
      }),
    });
  });

  it('already-spent armor is gone this score → NO_ARMOR, nothing written (heavy still counts)', async () => {
    const update = vi.fn();
    const r = repos({
      characters: {
        findWithDetails: vi
          .fn()
          .mockResolvedValue(ok(armored({ items: ['armor'], armorSpent: ['armor'] }))),
      },
      characterManagement: { updateCharacterWithValidation: update },
    });
    const out = await takeHarm(r, {
      characterId: 'c1',
      userId: 'u1',
      level: 'moderate',
      description: 'Slashed',
      spendArmor: true,
      logLabel: 'Silks',
      logNote: armorNote,
    });
    expect(out.success).toBe(false);
    if (!out.success) expect(out.error.code).toBe('NO_ARMOR');
    expect(update).not.toHaveBeenCalled();

    // …but a carried heavy-armor is a second box: still spendable after the first is gone.
    expect(
      availableArmor(DEFAULT_RULESET, {
        ...CHARACTER.characterData,
        loadout: { level: 'normal', items: ['armor', 'heavy-armor'], armorSpent: ['armor'] },
      } as CharacterWithDetails['characterData']).map(i => i.id)
    ).toEqual(['heavy-armor']);
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
