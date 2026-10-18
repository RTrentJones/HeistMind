// Rules-accuracy round (review-rules #1/#4/#8/#9): the BitD builtin's data + the engine's legality
// checks, exercised on the REAL builtin content (fixture provenance — never an invented shape).
import { describe, it, expect } from 'vitest';
import {
  advanceTier,
  crewHalvesTierCost,
  grandfatherHeldAbilities,
  isAbilityAdvanceable,
  isAbilityUnlocked,
  validateCharacter,
  type CharacterData,
} from '@heist-mind/core';
import { BLADES_IN_THE_DARK as BITD } from './blades-in-the-dark';

const ability = (id: string) => BITD.specialAbilities.find(a => a.id === id);
const codes = (r: { errors: { code: string }[] }) => r.errors.map(e => e.code);

/** A creation-legal Cutter (Skirmish 2 + Command 1 pre-placed; 4 more assigned). */
function cutter(o: Partial<CharacterData> = {}): CharacterData {
  return {
    playbook: 'cutter',
    attributes: {},
    skills: { Skirmish: 2, Command: 1, Hunt: 2, Prowl: 2 },
    specialAbilities: ['cutter-battleborn'],
    items: [],
    stress: 0,
    trauma: [],
    coins: 0,
    contacts: [],
    custom: {},
    ...o,
  };
}

describe('BitD builtin — playbooks', () => {
  it('every playbook offers Veteran (×3) plus its own book roster', () => {
    for (const pb of BITD.playbooks) {
      expect(pb.specialAbilities, pb.id).toEqual(
        expect.arrayContaining(['veteran', 'veteran-2', 'veteran-3'])
      );
      const own = pb.specialAbilities.filter(id => !id.startsWith('veteran'));
      expect(own.length, pb.id).toBe(pb.id === 'hound' ? 7 : 8);
      for (const id of own) expect(ability(id)?.category, `${pb.id} → ${id}`).toBe(pb.id);
    }
  });

  it('no ability belongs to two playbooks (Vigorous is the Cutter’s only)', () => {
    const seen = new Map<string, string>();
    for (const pb of BITD.playbooks)
      for (const id of pb.specialAbilities.filter(a => !a.startsWith('veteran'))) {
        expect(seen.get(id), id).toBeUndefined();
        seen.set(id, pb.id);
      }
    expect(BITD.specialAbilities.filter(a => a.name === 'Vigorous' && !a.retired)).toHaveLength(1);
  });

  it('keeps retired definitions readable for held sheets but never offers them', () => {
    const retired = BITD.specialAbilities.filter(a => a.retired).map(a => a.id);
    expect(retired).toEqual(
      expect.arrayContaining([
        'hound-tracker',
        'hound-vigorous',
        'slide-coverid',
        'slide-acalculating',
      ])
    );
    const rostered = new Set(BITD.playbooks.flatMap(pb => pb.specialAbilities));
    for (const id of retired) expect(rostered.has(id), id).toBe(false);
    // A Hound can't newly take one (not even through Veteran)…
    const hound = cutter({ playbook: 'hound', specialAbilities: ['veteran'] });
    expect(isAbilityUnlocked(BITD, hound, 'hound-tracker')).toBe(false);
    expect(isAbilityAdvanceable(BITD, hound, 'hound-tracker')).toBe(false);
    // …but a sheet that already holds one still validates its everyday writes (grandfathered).
    const held = cutter({ playbook: 'hound', specialAbilities: ['hound-tracker'] });
    const r = grandfatherHeldAbilities(
      validateCharacter(BITD, held, { mode: 'live', crew: { crewAbilities: [] } }),
      held.specialAbilities,
      held.specialAbilities
    );
    expect(r.errors.filter(e => e.field === 'specialAbilities.hound-tracker')).toEqual([]);
    expect(BITD.crew?.abilities?.filter(a => a.retired).map(a => a.id)).toEqual(
      expect.arrayContaining(['crew-deadly-friends', 'crew-fortified'])
    );
  });

  it('fixes the Hound name swap (ids stable): Sharpshooter is Sharpshooter, Scout is Scout', () => {
    expect(ability('hound-sharpshooter')?.name).toBe('Sharpshooter');
    expect(ability('hound-sharpshooter')?.rules).toMatch(/extreme distance/);
    expect(ability('hound-deadeye')?.name).toBe('Scout');
    expect(ability('hound-deadeye')?.rules).toMatch(/discover the location of a target/);
  });

  it('carries the SRD mechanics, not paraphrased-away ones', () => {
    expect(ability('cutter-vigorous')?.rules).toMatch(/healing clock/);
    expect(ability('cutter-vigorous')?.rules).toMatch(/\+1d to healing treatment/);
    for (const id of [
      'cutter-battleborn',
      'hound-focused',
      'leech-fortitude',
      'lurk-shadow',
      'slide-cloakspider',
      'spider-mastermind',
      'whisper-warded',
    ])
      expect(ability(id)?.rules, id).toMatch(/special armor/);
    expect(ability('lurk-expertise')?.rules).toMatch(/lead a group action/);
    expect(ability('slide-rooktwist')?.rules).toMatch(/Take 2 stress to roll your best action/);
    expect(ability('spider-foresight')?.rules).toMatch(/Two times per score/);
    expect(ability('spider-calculating')?.rules).toMatch(/\+1 downtime activity/);
    expect(ability('lurk-daredevil')?.rules).toMatch(/-1d to any resistance rolls/);
    expect(ability('whisper-strange')?.rules).toMatch(/\+1 result level/);
    expect(ability('lurk-infiltrator')?.rules).toMatch(/not affected by quality or Tier/);
    expect(ability('lurk-ambush')?.rules).toBe(
      'When you attack from hiding or spring a trap, you get +1d to your roll.'
    );
    expect(ability('spider-weavingwebs')?.name).toBe('Weaving the Web');
  });

  it('ability tiers are gone (the SRD has none) and Survivor adds a stress box', () => {
    expect(BITD.specialAbilities.every(a => a.tier === undefined)).toBe(true);
    expect(ability('hound-survivor')?.effects?.stressBoxes).toBe(1);
    expect(ability('veteran')?.effects?.veteran).toBe(1);
  });
});

describe('BitD builtin — crew abilities', () => {
  const crewAbility = (id: string) => BITD.crew?.abilities.find(a => a.id === id);

  it('Deadly is +1 to Hunt, Prowl, or Skirmish and lifts the creation cap', () => {
    expect(crewAbility('crew-deadly')?.effects).toEqual({
      bonusActionDots: 1,
      bonusActionDotsIn: ['Hunt', 'Prowl', 'Skirmish'],
      bonusDotsExceedCreationCap: true,
    });
  });

  it('Patron halves the Tier cost; No Traces is the SRD rep rule; crew Veteran grants no PC slot', () => {
    expect(crewHalvesTierCost(BITD, ['crew-patron'])).toBe(true);
    expect(crewAbility('crew-no-traces')?.description).toMatch(/half the rep value/);
    expect(crewAbility('crew-veteran')?.effects).toBeUndefined();
    const out = advanceTier({
      tier: 1,
      rep: 12,
      hold: 'strong',
      coin: 8,
      halfCost: crewHalvesTierCost(BITD, ['crew-patron']),
    });
    expect(out).toMatchObject({ ok: true, tier: 2, cost: 8 });
  });
});

describe('BitD legality — the review probes now fail validation', () => {
  it('a Cutter cannot start with a Lurk ability (no Veteran slot)', () => {
    const data = cutter({ specialAbilities: ['lurk-infiltrator'] });
    expect(isAbilityUnlocked(BITD, data, 'lurk-infiltrator')).toBe(false);
    expect(codes(validateCharacter(BITD, data, { mode: 'creation' }))).toContain('ABILITY_LOCKED');
  });

  it('…but Veteran + one other-playbook ability is a legal start', () => {
    const data = cutter({ specialAbilities: ['veteran', 'lurk-infiltrator'] });
    expect(validateCharacter(BITD, data, { mode: 'creation' }).isValid).toBe(true);
  });

  it('a played Cutter holding three cross-playbook abilities without Veteran is invalid live', () => {
    const data = cutter({
      specialAbilities: ['cutter-battleborn', 'whisper-tempest', 'lurk-ghost', 'leech-venomous'],
    });
    const r = validateCharacter(BITD, data, { mode: 'live', crew: { crewAbilities: [] } });
    expect(codes(r).filter(c => c === 'ABILITY_LOCKED')).toHaveLength(3);
    // One Veteran take covers exactly one of them.
    const oneVet = cutter({
      specialAbilities: ['cutter-battleborn', 'veteran', 'whisper-tempest'],
    });
    expect(validateCharacter(BITD, oneVet, { mode: 'live' }).isValid).toBe(true);
  });

  it("a Cutter can't move the playbook's pre-placed Skirmish/Command dots", () => {
    const data = cutter({ skills: { Hunt: 2, Study: 2, Survey: 2, Tinker: 1 } });
    expect(codes(validateCharacter(BITD, data, { mode: 'creation' }))).toContain(
      'ACTION_BELOW_PLAYBOOK'
    );
  });

  it('Deadly at creation: Skirmish 3 is legal; a Deadly dot in Sway is not', () => {
    const crew = { crewAbilities: ['crew-deadly'] };
    const skirmish3 = cutter({ skills: { Skirmish: 3, Command: 1, Hunt: 2, Prowl: 2 } });
    expect(validateCharacter(BITD, skirmish3, { mode: 'creation', crew }).isValid).toBe(true);
    // 8 dots with none of the extras in Hunt/Prowl/Skirmish → the bonus dot can only be in Sway.
    const sway = cutter({ skills: { Skirmish: 2, Command: 1, Study: 2, Tinker: 2, Sway: 1 } });
    expect(codes(validateCharacter(BITD, sway, { mode: 'creation', crew }))).toContain(
      'ACTION_BONUS_RESTRICTED'
    );
    // (The same total with a Hunt dot is fine: that dot can be the Deadly one — an equivalent,
    // reachable build.)
    const viaHunt = cutter({ skills: { Skirmish: 2, Command: 1, Hunt: 2, Prowl: 2, Sway: 1 } });
    expect(validateCharacter(BITD, viaHunt, { mode: 'creation', crew }).isValid).toBe(true);
  });
});
