// Lost-update spec (launch review item 2): every character-data write patches ONLY the fields it
// owns onto the LIVE row, so a stale client snapshot (a dirty build-editor draft, a sheet loaded
// before the GM marked harm) can never revert harm / XP / stress written by someone else.
import { describe, expect, it, vi } from 'vitest';
import type { Character, CharacterData, CharacterWithDetails, Result } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';
import { DEFAULT_RULESET } from '@heist-mind/shared';
import { saveCharacterBuild, sameJson, setStress } from './character-data';
import { indulgeVice } from './downtime';
import { saveLoadout } from './loadout';

const ok = <T>(data: T): Result<T> => ({ success: true, data });

const BASE_DATA: CharacterData = {
  playbook: 'cutter',
  heritage: 'Akoros',
  vice: 'Gambling',
  attributes: { insight: 1, prowess: 2, resolve: 1 },
  skills: { skirmish: 2 },
  specialAbilities: [],
  stress: 2,
  trauma: [],
  harm: { lesser: [], moderate: [], severe: [] },
  xp: { playbook: 1, attributes: {} },
  contacts: [],
  custom: {},
} as unknown as CharacterData;

function character(data: CharacterData, over: Partial<CharacterWithDetails> = {}) {
  return {
    id: 'c1',
    name: 'Silks',
    gameId: 'g1',
    createdBy: 'player',
    game: { createdBy: 'gm' },
    ruleset: { content: DEFAULT_RULESET },
    characterData: data,
    ...over,
  } as unknown as CharacterWithDetails;
}

/** Repos whose live row is `live`; the validated write echoes the written data back. */
function reposWithLive(live: CharacterWithDetails) {
  const update = vi.fn(
    async (
      _id: string,
      _u: string,
      d: { characterData: CharacterData }
    ): Promise<Result<Character>> => ok({ ...live, characterData: d.characterData } as Character)
  );
  const r = {
    characters: { findWithDetails: vi.fn().mockResolvedValue(ok(live)) },
    characterManagement: { updateCharacterWithValidation: update },
    rolls: { create: vi.fn().mockResolvedValue(ok({ id: 'r1' })) },
    crews: { findByGame: vi.fn().mockResolvedValue(ok(null)) },
  } as unknown as DatabaseRepositories;
  const written = () => update.mock.calls.at(-1)?.[2].characterData as CharacterData;
  return { r, update, written };
}

// What the GM / bot wrote AFTER the player's editor draft was snapshotted.
const LIVE_DATA: CharacterData = {
  ...BASE_DATA,
  stress: 5,
  harm: { lesser: ['Bruised'], moderate: ['Broken ribs'], severe: [] },
  xp: { playbook: 4, attributes: { prowess: 2 } },
  loadout: { level: 'light', items: ['blade'], scoreId: 's1' },
} as unknown as CharacterData;

describe('saveCharacterBuild — patches only the fields the player changed', () => {
  it('a build save (vice changed) does NOT revert harm, XP, stress, or the loadout written since', async () => {
    const { r, written } = reposWithLive(character(LIVE_DATA));
    const draft = { ...BASE_DATA, vice: 'Weird' } as CharacterData;
    const out = await saveCharacterBuild(r, {
      characterId: 'c1',
      userId: 'player',
      base: BASE_DATA,
      draft,
    });
    expect(out.success).toBe(true);
    const data = written();
    expect(data.vice).toBe('Weird');
    expect(data.stress).toBe(5);
    expect(data.harm).toEqual(LIVE_DATA.harm);
    expect(data.xp).toEqual(LIVE_DATA.xp);
    expect(data.loadout).toEqual(LIVE_DATA.loadout);
  });

  it('an attribute edit lands while stress clicked on the sheet survives', async () => {
    const { r, written } = reposWithLive(character({ ...BASE_DATA, stress: 7 }));
    const draft = { ...BASE_DATA, attributes: { ...BASE_DATA.attributes, insight: 2 } };
    await saveCharacterBuild(r, { characterId: 'c1', userId: 'player', base: BASE_DATA, draft });
    expect(written().attributes.insight).toBe(2);
    expect(written().stress).toBe(7);
  });

  it('refuses with CHARACTER_CONFLICT when a field the player edited also changed underneath', async () => {
    const { r, update } = reposWithLive(character(LIVE_DATA));
    // The player edited harm in the editor's stress tab, but the GM marked harm meanwhile.
    const draft = {
      ...BASE_DATA,
      harm: { lesser: ['Cut hand'], moderate: [], severe: [] },
    } as CharacterData;
    const out = await saveCharacterBuild(r, {
      characterId: 'c1',
      userId: 'player',
      base: BASE_DATA,
      draft,
    });
    expect(out.success).toBe(false);
    if (!out.success) {
      expect(out.error.code).toBe('CHARACTER_CONFLICT');
      expect(out.error.details).toBe('harm');
    }
    expect(update).not.toHaveBeenCalled();
  });

  it('is not a conflict when the live value already equals the draft (a re-save)', async () => {
    const live = character({ ...BASE_DATA, vice: 'Weird' });
    const { r, update } = reposWithLive(live);
    const out = await saveCharacterBuild(r, {
      characterId: 'c1',
      userId: 'player',
      base: BASE_DATA,
      draft: { ...BASE_DATA, vice: 'Weird' },
    });
    expect(out.success).toBe(true);
    expect(update).toHaveBeenCalledOnce();
  });

  it('writes nothing when the draft has no changes', async () => {
    const { r, update } = reposWithLive(character(LIVE_DATA));
    const out = await saveCharacterBuild(r, {
      characterId: 'c1',
      userId: 'player',
      base: BASE_DATA,
      draft: structuredClone(BASE_DATA),
    });
    expect(out).toEqual(ok(null));
    expect(update).not.toHaveBeenCalled();
  });

  it('filling the stress track in the editor follows RAW overflow (stress 0, one trauma owed)', async () => {
    const max = DEFAULT_RULESET.stress?.max ?? 9;
    const { r, written } = reposWithLive(character(LIVE_DATA));
    const base = { ...LIVE_DATA };
    const draft = { ...LIVE_DATA, stress: max };
    const out = await saveCharacterBuild(r, { characterId: 'c1', userId: 'player', base, draft });
    expect(out.success).toBe(true);
    expect(written()).toMatchObject({ stress: 0, traumaPending: 1 });
  });

  it("lets the campaign's GM save (mirrors RLS) and rejects anyone else", async () => {
    const { r } = reposWithLive(character(LIVE_DATA));
    const input = { characterId: 'c1', base: BASE_DATA, draft: { ...BASE_DATA, vice: 'Weird' } };
    expect((await saveCharacterBuild(r, { ...input, userId: 'gm' })).success).toBe(true);
    const denied = await saveCharacterBuild(r, { ...input, userId: 'stranger' });
    expect(denied.success).toBe(false);
    if (!denied.success) expect(denied.error.code).toBe('NOT_OWNER');
  });
});

describe('setStress — the sheet tracker patches only stress, from the live row', () => {
  it('keeps harm and XP the GM wrote after the sheet loaded', async () => {
    const { r, written } = reposWithLive(character(LIVE_DATA));
    await setStress(r, { characterId: 'c1', userId: 'player', stress: 3 });
    expect(written().stress).toBe(3);
    expect(written().harm).toEqual(LIVE_DATA.harm);
    expect(written().xp).toEqual(LIVE_DATA.xp);
  });

  it('clamps to the ruleset track and no-ops when already current', async () => {
    const { r, update, written } = reposWithLive(character(LIVE_DATA));
    await setStress(r, { characterId: 'c1', userId: 'player', stress: 99 });
    expect(written().stress).toBe(9);
    update.mockClear();
    expect(await setStress(r, { characterId: 'c1', userId: 'player', stress: 5 })).toEqual(
      ok(null)
    );
    expect(update).not.toHaveBeenCalled();
  });
});

describe('stale-snapshot callers merge onto the live row', () => {
  it('saveLoadout from a stale sheet snapshot keeps harm/XP written since', async () => {
    const { r, written } = reposWithLive(character(LIVE_DATA));
    await saveLoadout(r, {
      character: character(BASE_DATA),
      userId: 'player',
      loadout: { level: 'heavy', items: [] },
      logNote: 'heavy',
    });
    expect(written().loadout).toEqual({ level: 'heavy', items: [] });
    expect(written().harm).toEqual(LIVE_DATA.harm);
    expect(written().xp).toEqual(LIVE_DATA.xp);
  });

  it('indulgeVice clears from the LIVE stress, not the stale snapshot', async () => {
    const { r, written } = reposWithLive(character(LIVE_DATA));
    const out = await indulgeVice(r, {
      character: character(BASE_DATA),
      userId: 'player',
      results: [3],
      zeroDice: false,
      logLabel: 'vice',
    });
    expect(out.success && out.data.nextStress).toBe(2);
    expect(written().harm).toEqual(LIVE_DATA.harm);
  });
});

describe('sameJson', () => {
  it('ignores key order (JSONB reorders) but not values', () => {
    expect(sameJson({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 })).toBe(true);
    expect(sameJson({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameJson([1, 2], [2, 1])).toBe(false);
    expect(sameJson({ a: undefined }, {})).toBe(true);
    expect(sameJson(null, {})).toBe(false);
  });
});
