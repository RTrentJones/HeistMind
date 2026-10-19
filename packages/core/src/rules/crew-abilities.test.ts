// Crew abilities RAW (round-3 #1). Core can't import @heist-mind/shared (dependency direction), so
// this suite uses a minimal crew slice with the BitD SHAPE; the real BitD content is exercised in
// packages/shared's blades-in-the-dark.test.ts and the engine suite (fixture provenance, F69).
import { describe, expect, it } from 'vitest';
import type { CrewRules, RulesetContent } from '../domain';
import {
  checkCrewProgression,
  consumesCrewVeteranSlot,
  crewAbilityName,
  crewAbilityTypes,
  CREW_STARTING_PICK_KEY,
  crewStartingPickAvailable,
  crewStartingPickSpent,
  crewUpgradeBoxes,
  crewVeteranGatewayFor,
  isCrewAbilityUnlocked,
  isOwnCrewTypeAbility,
  openCrewUpgrades,
  planCrewAdvance,
  takeableCrewAbilities,
  withCrewStartingPickSpent,
  type CrewAbilityState,
} from './crew-abilities';

const crewRules: CrewRules = {
  types: [
    { id: 'shadows', name: 'Shadows', description: '' },
    { id: 'assassins', name: 'Assassins', description: '' },
  ],
  abilities: [
    { id: 'second-story', name: 'Second Story', description: '', crewType: 'shadows' },
    { id: 'pack-rats', name: 'Pack Rats', description: '', crewType: 'shadows' },
    { id: 'deadly', name: 'Deadly', description: '', crewType: 'assassins' },
    { id: 'predators', name: 'Predators', description: '', crewType: 'assassins' },
    { id: 'patron', name: 'Patron', description: '', crewTypes: ['assassins', 'shadows'] },
    { id: 'veteran', name: 'Veteran', description: '', effects: { crewVeteran: 1 } },
    {
      id: 'veteran-2',
      name: 'Veteran (second)',
      description: '',
      prerequisite: 'veteran',
      effects: { crewVeteran: 1 },
    },
    {
      id: 'mastery',
      name: 'Mastery',
      description: '',
      upgradeBoxes: 4,
      effects: { actionMax: 4 },
    },
    { id: 'old', name: 'Old', description: '', retired: true },
  ],
};
const rs = { crew: crewRules } as Pick<RulesetContent, 'crew'>;

const crew = (o: Partial<CrewAbilityState> = {}): CrewAbilityState => ({
  crewType: 'shadows',
  crewAbilities: ['second-story'],
  resources: {},
  ...o,
});
const full = (o: Partial<CrewAbilityState> = {}) => crew({ resources: { 'crew-xp': 8 }, ...o });

describe('crew ability lists (own type, shared, multi-type)', () => {
  it('own list = the crew type’s abilities + shared ones + multi-type ones that include it', () => {
    const def = (id: string) => crewRules.abilities.find(a => a.id === id)!;
    expect(crewAbilityTypes(def('patron'))).toEqual(['assassins', 'shadows']);
    expect(isOwnCrewTypeAbility(rs, 'shadows', def('pack-rats'))).toBe(true);
    expect(isOwnCrewTypeAbility(rs, 'shadows', def('deadly'))).toBe(false);
    expect(isOwnCrewTypeAbility(rs, 'shadows', def('veteran'))).toBe(true);
    expect(isOwnCrewTypeAbility(rs, 'shadows', def('patron'))).toBe(true);
    // No crew type (or an unknown one) → lenient, like a rosterless playbook.
    expect(isOwnCrewTypeAbility(rs, null, def('deadly'))).toBe(true);
    expect(isOwnCrewTypeAbility(rs, 'pirates', def('deadly'))).toBe(true);
    expect(crewAbilityName(rs, 'deadly')).toBe('Deadly');
    expect(crewAbilityName(rs, 'gone')).toBe('gone');
  });

  it('another type’s ability needs a crew Veteran slot; each Veteran opens exactly one', () => {
    expect(consumesCrewVeteranSlot(rs, crew(), 'deadly')).toBe(true);
    expect(isCrewAbilityUnlocked(rs, crew(), 'deadly')).toBe(false);
    expect(isCrewAbilityUnlocked(rs, crew({ crewAbilities: ['veteran'] }), 'deadly')).toBe(true);
    const spent = crew({ crewAbilities: ['veteran', 'deadly'] });
    expect(isCrewAbilityUnlocked(rs, spent, 'deadly')).toBe(true); // held, re-validated
    expect(isCrewAbilityUnlocked(rs, spent, 'predators')).toBe(false); // slot used
    // Veteran (second) needs the first, then opens another.
    expect(isCrewAbilityUnlocked(rs, crew(), 'veteran-2')).toBe(false);
    expect(crewVeteranGatewayFor(rs, spent, 'predators')).toBe('veteran-2');
  });

  it('retired abilities stay only when held; upgrades are never taken as abilities', () => {
    expect(isCrewAbilityUnlocked(rs, crew(), 'old')).toBe(false);
    expect(isCrewAbilityUnlocked(rs, crew({ crewAbilities: ['old'] }), 'old')).toBe(true);
    expect(isCrewAbilityUnlocked(rs, crew(), 'mastery')).toBe(false);
    expect(takeableCrewAbilities(rs, crew()).map(a => a.id)).toEqual([
      'pack-rats',
      'deadly', // via Veteran (taken together in one advance)
      'predators',
      'patron',
      'veteran',
    ]);
  });
});

describe('planCrewAdvance (RAW: one pick at creation; then a full track → ability OR 2 boxes)', () => {
  it('a crew with no special ability takes its first one free, from its own list', () => {
    const fresh = crew({ crewAbilities: [] });
    expect(crewStartingPickAvailable(rs, fresh)).toBe(true);
    const plan = planCrewAdvance(rs, fresh, { kind: 'ability', abilityId: 'pack-rats' });
    expect(plan).toMatchObject({ ok: true, startingPick: true, crewAbilities: ['pack-rats'] });
    expect(crewStartingPickAvailable(rs, crew())).toBe(false);
  });

  it('every later ability needs a FULL track, which it clears', () => {
    expect(planCrewAdvance(rs, crew(), { kind: 'ability', abilityId: 'pack-rats' })).toEqual({
      ok: false,
      code: 'TRACK_NOT_FULL',
    });
    const plan = planCrewAdvance(rs, full(), { kind: 'ability', abilityId: 'pack-rats' });
    expect(plan).toMatchObject({
      ok: true,
      startingPick: false,
      crewAbilities: ['second-story', 'pack-rats'],
      resources: { 'crew-xp': 0 },
    });
  });

  it('refuses held, unknown, locked and upgrade-as-ability picks', () => {
    const code = (c: Parameters<typeof planCrewAdvance>[2], s = full()) => {
      const p = planCrewAdvance(rs, s, c);
      return p.ok ? 'ok' : p.code;
    };
    expect(code({ kind: 'ability', abilityId: 'second-story' })).toBe('ABILITY_HELD');
    expect(code({ kind: 'ability', abilityId: 'nope' })).toBe('UNKNOWN_ABILITY');
    expect(code({ kind: 'ability', abilityId: 'mastery' })).toBe('ABILITY_LOCKED');
    expect(code({ kind: 'ability', abilityId: 'old' })).toBe('ABILITY_LOCKED');
    // Both Veteran slots spent on Assassins abilities → a third type pick has no way in.
    const spentRs = {
      crew: {
        ...crewRules,
        abilities: [
          ...crewRules.abilities,
          { id: 'vipers', name: 'Vipers', description: '', crewType: 'assassins' },
        ],
      },
    };
    const spent = full({
      crewAbilities: ['second-story', 'veteran', 'veteran-2', 'deadly', 'predators'],
    });
    const p = planCrewAdvance(spentRs, spent, { kind: 'ability', abilityId: 'vipers' });
    expect(p.ok ? 'ok' : p.code).toBe('ABILITY_LOCKED');
    expect(code({ kind: 'upgrades', upgradeId: 'pack-rats' })).toBe('NOT_AN_UPGRADE');
    expect(code({ kind: 'upgrades', upgradeId: 'mastery' }, crew())).toBe('TRACK_NOT_FULL');
  });

  it('Veteran + another type’s ability land together in one advance', () => {
    const plan = planCrewAdvance(rs, full(), { kind: 'ability', abilityId: 'deadly' });
    expect(plan).toMatchObject({ ok: true, added: ['veteran', 'deadly'] });
  });

  it('Mastery costs four upgrade boxes — two per advance — then joins the held list', () => {
    const one = planCrewAdvance(rs, full(), { kind: 'upgrades', upgradeId: 'mastery' });
    expect(one).toMatchObject({
      ok: true,
      crewAbilities: ['second-story'],
      resources: { 'crew-xp': 0, 'crew-upgrade:mastery': 2 },
      upgrade: { id: 'mastery', boxes: 2, size: 4, completed: false },
    });
    if (!one.ok) throw new Error('expected ok');
    expect(
      crewUpgradeBoxes(
        rs,
        { crewAbilities: one.crewAbilities, resources: one.resources },
        'mastery'
      )
    ).toBe(2);
    const two = planCrewAdvance(
      rs,
      full({ resources: { 'crew-xp': 8, 'crew-upgrade:mastery': 2 } }),
      { kind: 'upgrades', upgradeId: 'mastery' }
    );
    expect(two).toMatchObject({
      ok: true,
      crewAbilities: ['second-story', 'mastery'],
      resources: { 'crew-xp': 0 },
      upgrade: { completed: true },
    });
    const done = full({ crewAbilities: ['second-story', 'mastery'] });
    expect(openCrewUpgrades(rs, done)).toEqual([]);
    expect(planCrewAdvance(rs, done, { kind: 'upgrades', upgradeId: 'mastery' })).toEqual({
      ok: false,
      code: 'UPGRADE_COMPLETE',
    });
    // Upgrades the app doesn't model: the track clears, the table records them on paper.
    expect(planCrewAdvance(rs, full(), { kind: 'upgrades' })).toMatchObject({
      ok: true,
      resources: { 'crew-xp': 0 },
      added: [],
    });
  });
});

describe('the free starting pick is spent once (round 4 P2-N9: remove-all + re-pick churn)', () => {
  it('the starting pick records itself in resources', () => {
    const plan = planCrewAdvance(rs, crew({ crewAbilities: [] }), {
      kind: 'ability',
      abilityId: 'pack-rats',
    });
    expect(plan.ok && plan.resources[CREW_STARTING_PICK_KEY]).toBe(1);
  });

  it('removing every ability does NOT re-open a free pick once it was spent', () => {
    const emptied = crew({ crewAbilities: [], resources: { [CREW_STARTING_PICK_KEY]: 1 } });
    expect(crewStartingPickSpent(rs, emptied)).toBe(true);
    expect(crewStartingPickAvailable(rs, emptied)).toBe(false);
    expect(planCrewAdvance(rs, emptied, { kind: 'ability', abilityId: 'pack-rats' })).toEqual({
      ok: false,
      code: 'TRACK_NOT_FULL',
    });
    // The gate refuses the churned free pick; a full track still buys one.
    expect(
      checkCrewProgression(rs, emptied, {
        crewAbilities: ['pack-rats'],
        resources: { [CREW_STARTING_PICK_KEY]: 1 },
      })
    ).toMatchObject({ ok: false, code: 'TRACK_NOT_FULL' });
  });

  it('withCrewStartingPickSpent latches the flag on any write after the pick (legacy crews too)', () => {
    // A legacy crew (picked before the flag existed) holding an ability → the next write records it.
    expect(withCrewStartingPickSpent(rs, crew(), {})).toEqual({ [CREW_STARTING_PICK_KEY]: 1 });
    // A write that drops the key keeps it.
    const flagged = crew({ crewAbilities: [], resources: { [CREW_STARTING_PICK_KEY]: 1 } });
    expect(withCrewStartingPickSpent(rs, flagged, { 'crew-xp': 2 })).toEqual({
      'crew-xp': 2,
      [CREW_STARTING_PICK_KEY]: 1,
    });
    // Already flagged → unchanged object; a fresh crew → nothing to latch.
    const next = { [CREW_STARTING_PICK_KEY]: 1 };
    expect(withCrewStartingPickSpent(rs, flagged, next)).toBe(next);
    const fresh = crew({ crewAbilities: [] });
    expect(withCrewStartingPickSpent(rs, fresh, { 'crew-xp': 1 })).toEqual({ 'crew-xp': 1 });
    // Holding only an UPGRADE (Mastery) isn't a spent special-ability pick.
    expect(crewStartingPickSpent(rs, crew({ crewAbilities: ['mastery'] }))).toBe(false);
  });
});

describe('checkCrewProgression (the repository write gate)', () => {
  it('passes writes that add nothing (removals, held legacy abilities — grandfathered)', () => {
    const legacy = crew({ crewAbilities: ['second-story', 'deadly', 'predators', 'mastery'] });
    expect(checkCrewProgression(rs, legacy, { ...legacy, resources: { 'crew-xp': 3 } })).toEqual({
      ok: true,
    });
    expect(
      checkCrewProgression(rs, legacy, { crewAbilities: ['second-story'], resources: {} })
    ).toEqual({ ok: true });
  });

  it('accepts exactly one planned advance and refuses a free tick', () => {
    const before = full();
    expect(
      checkCrewProgression(rs, before, {
        crewAbilities: ['second-story', 'pack-rats'],
        resources: { 'crew-xp': 0 },
      })
    ).toEqual({ ok: true });
    // Ticking an ability without spending the track (the old checkbox) is refused…
    const tick = checkCrewProgression(rs, crew(), {
      crewAbilities: ['second-story', 'pack-rats'],
      resources: {},
    });
    expect(tick).toMatchObject({ ok: false, code: 'TRACK_NOT_FULL' });
    // …as is another type's ability without a slot, two abilities for one advance, and Mastery.
    expect(
      checkCrewProgression(rs, before, {
        crewAbilities: ['second-story', 'pack-rats', 'patron'],
        resources: { 'crew-xp': 0 },
      }).ok
    ).toBe(false);
    expect(
      checkCrewProgression(rs, before, {
        crewAbilities: ['second-story', 'mastery'],
        resources: { 'crew-xp': 0 },
      }).ok
    ).toBe(false);
    // A new crew's starting pick from another type is Veteran + that ability, never it alone.
    expect(
      checkCrewProgression(rs, crew({ crewAbilities: [] }), {
        crewAbilities: ['deadly'],
        resources: {},
      }).ok
    ).toBe(false);
    expect(
      checkCrewProgression(rs, crew({ crewAbilities: [] }), {
        crewAbilities: ['veteran', 'deadly'],
        resources: {},
      })
    ).toEqual({ ok: true });
  });

  it('upgrade boxes may only rise through an advance', () => {
    expect(
      checkCrewProgression(rs, crew(), {
        crewAbilities: ['second-story'],
        resources: { 'crew-upgrade:mastery': 2 },
      })
    ).toMatchObject({ ok: false, code: 'TRACK_NOT_FULL' });
    expect(
      checkCrewProgression(rs, full(), {
        crewAbilities: ['second-story'],
        resources: { 'crew-xp': 0, 'crew-upgrade:mastery': 2 },
      })
    ).toEqual({ ok: true });
  });
});
