// Rules-accuracy round (review-rules #1/#4/#8/#9): the BitD builtin's data + the engine's legality
// checks, exercised on the REAL builtin content (fixture provenance — never an invented shape).
import { describe, it, expect } from 'vitest';
import {
  advanceTier,
  checkCrewProgression,
  crewAbilityTypes,
  crewVeteranGatewayFor,
  desperateRollTrigger,
  desperateRollXp,
  identityOptions,
  isCrewAbilityUnlocked,
  isCrewUpgrade,
  planCrewAdvance,
  sessionXpTriggers,
  takeableCrewAbilities,
  type CrewAbilityState,
  crewHalvesTierCost,
  grandfatherHeldAbilities,
  isAbilityAdvanceable,
  isAbilityUnlocked,
  validateCharacter,
  type CharacterData,
} from '@heist-mind/core';
import { validateRulesetContent } from '../ruleset-validation';
import { BLADES_IN_THE_DARK as BITD } from './blades-in-the-dark';

const ability = (id: string) => BITD.specialAbilities.find(a => a.id === id);
const codes = (r: { errors: { code: string }[] }) => r.errors.map(e => e.code);

/** A creation-legal Cutter (Skirmish 2 + Command 1 pre-placed; 4 more assigned; a vice). */
function cutter(o: Partial<CharacterData> = {}): CharacterData {
  return {
    playbook: 'cutter',
    vice: 'Stupor',
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
    // The crew Veteran opens another CREW type's ability — never a member's playbook slot.
    expect(crewAbility('crew-veteran')?.effects).toEqual({ crewVeteran: 1 });
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

describe('BitD builtin — every crew type carries its seven special abilities (round 5 P2-7)', () => {
  const own = (type: string) =>
    (BITD.crew?.abilities ?? [])
      .filter(a => !a.retired && crewAbilityTypes(a).includes(type))
      .map(a => a.name)
      .sort();

  it.each([
    [
      'assassins',
      ['Deadly', 'Death Veil', 'Emberdeath', 'No Traces', 'Patron', 'Predators', 'Vipers'],
    ],
    [
      'bravos',
      [
        'Blood Brothers',
        'Dangerous',
        'Door Kickers',
        'Fiends',
        'Forged in the Fire',
        'Patron',
        'War Dogs',
      ],
    ],
    [
      'cult',
      [
        'Anointed',
        'Bound in Darkness',
        'Chosen',
        'Conviction',
        'Glory Incarnate',
        'Sealed in Blood',
        'Zealotry',
      ],
    ],
    [
      'hawkers',
      [
        'Accord',
        'Ghost Market',
        'High Society',
        'Hooked',
        'Patron',
        'Silver Tongues',
        'The Good Stuff',
      ],
    ],
    [
      'shadows',
      [
        'Everyone Steals',
        'Ghost Echoes',
        'Pack Rats',
        'Patron',
        'Second Story',
        'Slippery',
        'Synchronized',
      ],
    ],
    [
      'smugglers',
      [
        'All Hands',
        'Ghost Passage',
        'Just Passing Through',
        'Leverage',
        'Like Part of the Family',
        'Reavers',
        'Renegades',
      ],
    ],
  ])('%s: seven own abilities (+ the shared Veteran)', (type, names) => {
    expect(own(type)).toEqual([...names].sort());
  });

  it('ids are unique and every entry has effect text; the +1-dot abilities mirror Deadly', () => {
    const all = BITD.crew?.abilities ?? [];
    expect(new Set(all.map(a => a.id)).size).toBe(all.length);
    for (const a of all) expect(a.description?.length ?? 0, a.id).toBeGreaterThan(20);
    const dots = (id: string) => all.find(a => a.id === id)?.effects;
    expect(dots('crew-dangerous')?.bonusActionDotsIn).toEqual(['Hunt', 'Skirmish', 'Wreck']);
    expect(dots('crew-chosen')?.bonusActionDotsIn).toEqual(['Attune', 'Study', 'Sway']);
    expect(dots('crew-silver-tongues')?.bonusActionDotsIn).toEqual(['Command', 'Consort', 'Sway']);
    expect(dots('crew-everyone-steals')?.bonusActionDotsIn).toEqual(['Prowl', 'Finesse', 'Tinker']);
    expect(dots('crew-renegades')?.bonusActionDotsIn).toEqual(['Finesse', 'Prowl', 'Skirmish']);
    // Every restricted action is a real BitD action.
    const actions = new Set(BITD.attributes.flatMap(a => a.skills));
    for (const a of all)
      for (const act of a.effects?.bonusActionDotsIn ?? [])
        expect(actions.has(act), act).toBe(true);
  });

  it('the content still passes ruleset validation', () => {
    const r = validateRulesetContent(BITD);
    expect(r.ok ? [] : r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('a Cult starting pick now offers its own seven (not just Anointed), Veteran as routes', () => {
    const fresh: CrewAbilityState = { crewType: 'cult', crewAbilities: [], resources: {} };
    const offered = takeableCrewAbilities(BITD, fresh)
      .filter(a => isCrewAbilityUnlocked(BITD, fresh, a.id))
      .map(a => a.id);
    expect(offered).toEqual(
      expect.arrayContaining([
        'crew-anointed',
        'crew-chosen',
        'crew-bound-in-darkness',
        'crew-conviction',
        'crew-glory-incarnate',
        'crew-sealed-in-blood',
        'crew-zealotry',
      ])
    );
    // Round 6 P2-7 — Veteran is offered as the route to another type's ability, not bare too.
    expect(offered).not.toContain('crew-veteran');
    expect(crewVeteranGatewayFor(BITD, fresh, 'crew-emberdeath')).toBe('crew-veteran');
    expect(offered).not.toContain('crew-patron'); // not on the Cult sheet
    expect(offered).not.toContain('crew-emberdeath'); // another type's: only via Veteran
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

// ----- round 3 (launch review) -------------------------------------------------------------------

const crewDef = (id: string) => BITD.crew?.abilities.find(a => a.id === id);

describe('BitD crew abilities follow RAW (round-3 #1)', () => {
  const shadows = (o: Partial<CrewAbilityState> = {}): CrewAbilityState => ({
    crewType: 'shadows',
    crewAbilities: ['crew-second-story'],
    resources: { 'crew-xp': 8 },
    ...o,
  });

  it('every crew ability is typed (or shared: Veteran); Patron sits on four crew sheets', () => {
    const types = new Set((BITD.crew?.types ?? []).map(t => t.id));
    for (const a of BITD.crew?.abilities ?? []) {
      if (a.retired) continue;
      for (const t of crewAbilityTypes(a)) expect(types.has(t), `${a.id} → ${t}`).toBe(true);
    }
    expect(crewAbilityTypes(crewDef('crew-patron')!)).toEqual([
      'assassins',
      'bravos',
      'hawkers',
      'shadows',
    ]);
    expect(crewAbilityTypes(crewDef('crew-veteran')!)).toEqual([]);
  });

  it('a Shadows crew is offered its own list + Veteran routes — never every crew type freely', () => {
    const fresh = shadows({ crewAbilities: [], resources: {} });
    // Starting pick: Shadows' own abilities and Patron; Veteran only as the route that opens ONE
    // other-type pick (round 6 P2-7 — it was also offered bare: the same choice twice).
    const own = takeableCrewAbilities(BITD, fresh)
      .filter(a => isCrewAbilityUnlocked(BITD, fresh, a.id))
      .map(a => a.id);
    expect(own).toEqual(
      expect.arrayContaining([
        'crew-network',
        'crew-second-story',
        'crew-synchronized',
        'crew-patron',
      ])
    );
    expect(own).not.toContain('crew-veteran');
    expect(takeableCrewAbilities(BITD, fresh).map(a => a.id)).not.toContain('crew-veteran');
    expect(own).not.toContain('crew-deadly');
    expect(own).not.toContain('crew-mastery');
    expect(isCrewAbilityUnlocked(BITD, fresh, 'crew-fiends')).toBe(false);
  });

  it('Mastery is an upgrade: two advances of upgrade boxes, never a ticked ability', () => {
    expect(isCrewUpgrade(crewDef('crew-mastery'))).toBe(true);
    expect(
      planCrewAdvance(BITD, shadows(), { kind: 'ability', abilityId: 'crew-mastery' })
    ).toEqual({ ok: false, code: 'ABILITY_LOCKED' });
    const first = planCrewAdvance(BITD, shadows(), { kind: 'upgrades', upgradeId: 'crew-mastery' });
    expect(first).toMatchObject({ ok: true, upgrade: { boxes: 2, size: 4, completed: false } });
  });

  it('the old “tick everything” crew is grandfathered for everyday writes but can’t add more', () => {
    const all = (BITD.crew?.abilities ?? []).map(a => a.id);
    const legacy = shadows({ crewAbilities: all, resources: {} });
    expect(checkCrewProgression(BITD, legacy, { ...legacy, resources: { 'crew-xp': 2 } })).toEqual({
      ok: true,
    });
    const ticked = checkCrewProgression(BITD, shadows({ resources: {} }), {
      crewAbilities: ['crew-second-story', 'crew-deadly'],
      resources: {},
    });
    expect(ticked.ok).toBe(false);
  });
});

describe('BitD XP triggers (F92 deferred, round-3 #3)', () => {
  it('the desperate trigger marks the rolled action’s ATTRIBUTE, every time', () => {
    const trigger = desperateRollTrigger(BITD);
    expect(trigger?.kind).toBe('desperate-roll');
    expect(trigger?.description).toMatch(/every time/i);
    expect(trigger?.description).toMatch(/attribute/);
    expect(desperateRollXp(BITD, cutter(), 'Skirmish')).toEqual({ track: 'prowess', amount: 1 });
    expect(desperateRollXp(BITD, cutter(), 'Hunt')).toEqual({ track: 'insight', amount: 1 });
    expect(desperateRollXp(BITD, cutter(), 'Sway')).toEqual({ track: 'resolve', amount: 1 });
  });

  it('every playbook has its own "addressed a challenge with…" trigger, listed first', () => {
    for (const pb of BITD.playbooks) {
      expect(pb.xpTrigger, pb.id).toMatch(/^You addressed a challenge with /);
      const list = sessionXpTriggers(BITD, pb.id);
      expect(list[0]?.description).toBe(pb.xpTrigger);
      expect(list.map(t => t.description)).toEqual([
        pb.xpTrigger,
        'You expressed your beliefs, drives, heritage, or background.',
        'You struggled with issues from your vice or traumas during the session.',
      ]);
    }
    expect(BITD.playbooks.find(p => p.id === 'cutter')?.xpTrigger).toBe(
      'You addressed a challenge with violence or coercion.'
    );
  });
});

describe('BitD vices + backgrounds (round-3 #4)', () => {
  it('lists the seven vices and seven backgrounds as identity options', () => {
    expect(identityOptions(BITD, 'vice').map(o => o.name)).toEqual([
      'Faith',
      'Gambling',
      'Luxury',
      'Obligation',
      'Pleasure',
      'Stupor',
      'Weird',
    ]);
    expect(identityOptions(BITD, 'background').map(o => o.name)).toEqual([
      'Academic',
      'Labor',
      'Law',
      'Trade',
      'Military',
      'Noble',
      'Underworld',
    ]);
    // Heritage stays free text (BitD's heritages are setting content).
    expect(identityOptions(BITD, 'heritage')).toEqual([]);
  });

  it('the Vice step is REQUIRED at creation (round 4: it could be skipped while showing ✓)', () => {
    expect(BITD.characterCreation?.steps?.find(st => st.id === 'vice')?.required).toBe(true);
    const r = validateCharacter(BITD, cutter({ vice: '' }), { mode: 'creation' });
    expect(r.errors.map(e => e.field)).toContain('steps.vice');
    // A played sheet without a vice keeps working (live mode doesn't re-run creation steps).
    expect(validateCharacter(BITD, cutter({ vice: '' }), { mode: 'live' }).isValid).toBe(true);
  });

  it('a new scoundrel picks a listed vice; the details/purveyor ride alongside', () => {
    const ok = cutter({ vice: 'Gambling', viceDetail: 'Cards at the Silver Gull — Old Mags' });
    expect(validateCharacter(BITD, ok, { mode: 'creation' }).isValid).toBe(true);
    expect(
      codes(validateCharacter(BITD, cutter({ vice: 'cards' }), { mode: 'creation' }))
    ).toContain('IDENTITY_UNKNOWN');
  });
});

describe('BitD creation assigns all seven action dots (round-3 #2)', () => {
  it('3 placed + 4 assigned is legal; 3 placed + 0 assigned is refused with the count', () => {
    expect(validateCharacter(BITD, cutter(), { mode: 'creation' }).isValid).toBe(true);
    const r = validateCharacter(BITD, cutter({ skills: { Skirmish: 2, Command: 1 } }), {
      mode: 'creation',
    });
    expect(codes(r)).toContain('ACTION_POINTS_UNSPENT');
    expect(r.errors.find(e => e.code === 'ACTION_POINTS_UNSPENT')?.message).toBe(
      'Assign all 7 action dots — 4 left to place.'
    );
  });
});
