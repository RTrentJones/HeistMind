// The engine's behavior spec — every use-case exercised against mocked repositories, no DB, no
// browser. These tests are also the Discord bot's contract: a command wrapping a use-case can rely
// on exactly this sequencing.
import { describe, expect, it, vi } from 'vitest';
import type { Character, CharacterWithDetails, Result } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { applyStress, retireCharacter } from './characters';
import { indulgeVice, viceDicePool } from './downtime';
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

  it('charges nothing on a crit resist (highest die 6)', async () => {
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
  it('persists the loadout and logs to the campaign feed', async () => {
    const update = vi.fn().mockResolvedValue(ok({} as Character));
    const create = vi.fn().mockResolvedValue(ok({ id: 'r1' }));
    const r = repos({ characters: { update }, rolls: { create } });
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
    const r = repos({ characters: { update }, rolls: { create } });
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
