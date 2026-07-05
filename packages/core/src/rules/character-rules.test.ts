import { describe, it, expect } from 'vitest';
import type { RulesetContent, CharacterData } from '../domain';
import {
  clampStress,
  validateCharacter,
  pointBuySpent,
  abilityChoiceLimit,
  isAbilityUnlocked,
  stressBounds,
  advancementCost,
  usesActionRatings,
  rulesetActions,
  actionDotsSpent,
  deriveAttributes,
  harmBounds,
  loadLimit,
  loadUsed,
  usesXpTracks,
  xpTrackSize,
  xpMarks,
  xpTrackFull,
  advanceTrack,
  markXpTrack,
  clearXpTrack,
  PLAYBOOK_TRACK,
  DEFAULT_STRESS,
  DEFAULT_HARM,
  effectiveLoadLimit,
} from './character-rules';

/** An action-rating ruleset: two attributes with 2 actions each; playbook seeds one dot. */
function actionRuleset(overrides: Partial<RulesetContent> = {}): RulesetContent {
  return ruleset({
    playbooks: [
      {
        id: 'razor',
        name: 'The Razor',
        description: '',
        startingAbilities: [],
        specialAbilities: [],
        contacts: [],
        equipment: [],
        attributes: {},
        skills: { Clash: 1 },
      },
    ],
    attributes: [
      { id: 'force', name: 'Force', description: '', skills: ['Clash', 'Skulk'] },
      { id: 'cunning', name: 'Cunning', description: '', skills: ['Track', 'Rig'] },
    ],
    characterCreation: {
      steps: [
        { id: 'playbook', name: 'Playbook', description: '', order: 1, required: true },
        { id: 'action-ratings', name: 'Actions', description: '', order: 2, required: true },
      ],
      actionRatings: { points: 2, maxAtCreation: 2, max: 3 },
    },
    ...overrides,
  });
}

function ruleset(overrides: Partial<RulesetContent> = {}): RulesetContent {
  return {
    metadata: { name: 'Test', version: '1.0.0', author: 'T', description: 'd', system: 'FitD' },
    playbooks: [
      {
        id: 'razor',
        name: 'The Razor',
        description: '',
        startingAbilities: ['battle-born'],
        specialAbilities: ['battle-born', 'menace'],
        contacts: [],
        equipment: [],
        attributes: {},
        skills: {},
      },
    ],
    attributes: [
      { id: 'grit', name: 'Grit', description: '', skills: [], maxValue: 4 },
      { id: 'edge', name: 'Edge', description: '', skills: [], maxValue: 4 },
    ],
    skills: [],
    specialAbilities: [
      { id: 'battle-born', name: 'Battle-Born', description: '', tier: 1 },
      { id: 'ghost-step', name: 'Ghost Step', description: '', tier: 2 },
      { id: 'menace', name: 'Menace', description: '', tier: 1, prerequisite: 'battle-born' },
    ],
    equipment: { loadCapacity: {}, items: [], categories: [] },
    advancement: {
      xpTriggers: [],
      advancementOptions: [
        { id: 'buy-ability', name: 'New Ability', description: '', cost: 6, category: 'ability' },
      ],
    },
    characterCreation: {
      steps: [
        { id: 'playbook', name: 'Choose Playbook', description: '', order: 1, required: true },
      ],
      pointBuy: { totalPoints: 7, attributeCosts: { 1: 1, 2: 2, 3: 3, 4: 4 }, skillCosts: {} },
    },
    ...overrides,
  };
}

function character(overrides: Partial<CharacterData> = {}): CharacterData {
  return {
    playbook: 'razor',
    attributes: {},
    skills: {},
    // A created character always has its one starting ability (BitD: pick 1 at creation).
    specialAbilities: ['battle-born'],
    items: [],
    stress: 0,
    trauma: [],
    coins: 0,
    contacts: [],
    custom: {},
    ...overrides,
  };
}

const codes = (r: { errors: { code: string }[] }) => r.errors.map(e => e.code);

describe('pointBuySpent', () => {
  it('with the identity cost map equals the sum of ratings (back-compat with AttributesStep)', () => {
    const rs = ruleset();
    expect(pointBuySpent(rs, { grit: 2, edge: 3 })).toBe(5);
    expect(pointBuySpent(rs, { grit: 4, edge: 1 })).toBe(5);
  });
  it('falls back to linear when no cost map is defined', () => {
    const rs = ruleset({ characterCreation: { steps: [] } });
    expect(pointBuySpent(rs, { grit: 2, edge: 1 })).toBe(3);
  });
});

describe('abilityChoiceLimit', () => {
  it('uses an explicit abilityChoices when set', () => {
    const rs = ruleset({ characterCreation: { steps: [], abilityChoices: 3 } });
    expect(abilityChoiceLimit(rs, 'razor')).toBe(3);
  });
  it('falls back to the playbook starting-ability count', () => {
    expect(abilityChoiceLimit(ruleset(), 'razor')).toBe(1);
  });
  it('defaults to 1 for an unknown playbook', () => {
    expect(abilityChoiceLimit(ruleset(), 'nope')).toBe(1);
  });
});

describe('stressBounds', () => {
  it('defaults to BitD values when the ruleset omits stress', () => {
    expect(stressBounds(ruleset())).toEqual(DEFAULT_STRESS);
  });
  it('uses the ruleset stress block when present', () => {
    expect(stressBounds(ruleset({ stress: { max: 6, traumaMax: 3 } }))).toEqual({
      max: 6,
      traumaMax: 3,
    });
  });
});

describe('advancementCost', () => {
  it('resolves cost from the matching advancement option (trusted over client cost)', () => {
    expect(
      advancementCost(ruleset(), {
        type: 'ability',
        target: 'buy-ability',
        cost: 1,
        description: '',
      })
    ).toBe(6);
  });
  it('falls back to the supplied cost when no option matches', () => {
    expect(
      advancementCost(ruleset(), { type: 'skill', target: 'x', cost: 2, description: '' })
    ).toBe(2);
  });
});

describe('isAbilityUnlocked', () => {
  it('locks an ability whose prerequisite is not held', () => {
    expect(
      isAbilityUnlocked(ruleset(), character({ specialAbilities: ['menace'] }), 'menace')
    ).toBe(false);
  });
  it('unlocks once the prerequisite is held', () => {
    expect(
      isAbilityUnlocked(
        ruleset(),
        character({ specialAbilities: ['battle-born', 'menace'] }),
        'menace'
      )
    ).toBe(true);
  });
  it('locks a tier-2 ability not in the playbook roster and without a prereq', () => {
    expect(isAbilityUnlocked(ruleset(), character(), 'ghost-step')).toBe(false);
  });
  it('unlocks a tier-2 ability that is in the chosen playbook roster', () => {
    const rs = ruleset();
    rs.playbooks[0]!.specialAbilities = ['ghost-step'];
    expect(isAbilityUnlocked(rs, character(), 'ghost-step')).toBe(true);
  });
});

describe('validateCharacter — creation mode', () => {
  it('passes a legal build', () => {
    const r = validateCharacter(
      ruleset(),
      character({ attributes: { grit: 2 }, specialAbilities: ['battle-born'] }),
      { mode: 'creation' }
    );
    expect(r.isValid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('blocks exceeding the point-buy budget', () => {
    const r = validateCharacter(ruleset(), character({ attributes: { grit: 4, edge: 4 } }), {
      mode: 'creation',
    });
    expect(r.isValid).toBe(false);
    expect(codes(r)).toContain('POINTBUY_OVER');
  });

  it('warns (does not block) when under budget', () => {
    const r = validateCharacter(ruleset(), character({ attributes: { grit: 2 } }), {
      mode: 'creation',
    });
    expect(r.isValid).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('blocks an attribute over its cap', () => {
    const r = validateCharacter(ruleset(), character({ attributes: { grit: 5 } }), {
      mode: 'creation',
    });
    expect(codes(r)).toContain('ATTR_OVER_CAP');
  });

  it('blocks negative attributes', () => {
    const r = validateCharacter(ruleset(), character({ attributes: { grit: -1 } }), {
      mode: 'creation',
    });
    expect(codes(r)).toContain('ATTR_NEGATIVE');
  });

  it('blocks too many abilities', () => {
    const rs = ruleset({ characterCreation: { steps: [], abilityChoices: 1 } });
    const r = validateCharacter(rs, character({ specialAbilities: ['battle-born', 'sharpshot'] }), {
      mode: 'creation',
    });
    expect(codes(r)).toContain('ABILITY_LIMIT');
  });

  it('blocks a locked ability (missing prerequisite)', () => {
    const rs = ruleset({ characterCreation: { steps: [], abilityChoices: 5 } });
    const r = validateCharacter(rs, character({ specialAbilities: ['menace'] }), {
      mode: 'creation',
    });
    expect(codes(r)).toContain('ABILITY_LOCKED');
  });

  it('tier-locks a cross-playbook ability: error in a campaign, warning standalone', () => {
    // ghost-step is tier 2, has no prerequisite, and is not in the Razor's roster.
    const rs = ruleset({ characterCreation: { steps: [], abilityChoices: 5 } });
    const data = character({ specialAbilities: ['ghost-step'] });
    // In a campaign (crew context) with no veteran grant → blocked.
    const inCampaign = validateCharacter(rs, data, {
      mode: 'creation',
      crew: { crewAbilities: [] },
    });
    expect(inCampaign.errors.find(e => e.code === 'ABILITY_LOCKED')?.message).toMatch(
      /not available at character creation/
    );
    // Standalone (no crew context) → can't verify a crew grant, so warn rather than block.
    const standalone = validateCharacter(rs, data, { mode: 'creation' });
    expect(standalone.errors.some(e => e.code === 'ABILITY_LOCKED')).toBe(false);
    expect(standalone.warnings.length).toBeGreaterThan(0);
  });

  it('a crew veteran grant unlocks a tier-2 cross-playbook ability', () => {
    const rs = ruleset({
      characterCreation: { steps: [], abilityChoices: 5 },
      crew: {
        types: [],
        abilities: [{ id: 'crew-vet', name: 'Veteran', description: '', effects: { veteran: 1 } }],
      },
    });
    const r = validateCharacter(rs, character({ specialAbilities: ['ghost-step'] }), {
      mode: 'creation',
      crew: { crewAbilities: ['crew-vet'] },
    });
    expect(r.errors.some(e => e.code === 'ABILITY_LOCKED')).toBe(false);
  });

  it('veteran grants are a BUDGET: one grant cannot cover two cross-playbook picks', () => {
    const rs = ruleset({
      characterCreation: { steps: [], abilityChoices: 5 },
      crew: {
        types: [],
        abilities: [{ id: 'crew-vet', name: 'Veteran', description: '', effects: { veteran: 1 } }],
      },
    });
    // A second tier-2 ability outside the Razor's roster, alongside ghost-step.
    rs.specialAbilities = [
      ...(rs.specialAbilities ?? []),
      { id: 'shadow-form', name: 'Shadow Form', description: '', tier: 2 },
    ];
    const twoPicks = character({ specialAbilities: ['ghost-step', 'shadow-form'] });
    const over = validateCharacter(rs, twoPicks, {
      mode: 'creation',
      crew: { crewAbilities: ['crew-vet'] },
    });
    expect(over.errors.some(e => e.code === 'ABILITY_LOCKED')).toBe(true);

    // Two grants cover both picks.
    rs.crew!.abilities = [
      { id: 'crew-vet', name: 'Veteran', description: '', effects: { veteran: 2 } },
    ];
    const covered = validateCharacter(rs, twoPicks, {
      mode: 'creation',
      crew: { crewAbilities: ['crew-vet'] },
    });
    expect(covered.errors.some(e => e.code === 'ABILITY_LOCKED')).toBe(false);
  });

  it('isAbilityUnlocked offers a candidate only while a veteran slot is free', () => {
    const rs = ruleset({
      crew: {
        types: [],
        abilities: [{ id: 'crew-vet', name: 'Veteran', description: '', effects: { veteran: 1 } }],
      },
    });
    rs.specialAbilities = [
      ...(rs.specialAbilities ?? []),
      { id: 'shadow-form', name: 'Shadow Form', description: '', tier: 2 },
    ];
    const crew = { crewAbilities: ['crew-vet'] };
    // Slot free → the candidate is offered.
    expect(isAbilityUnlocked(rs, character(), 'ghost-step', crew)).toBe(true);
    // Slot consumed by ghost-step → a second cross-playbook candidate is locked, but the HELD
    // pick itself still validates (it occupies the slot it consumed).
    const holding = character({ specialAbilities: ['ghost-step'] });
    expect(isAbilityUnlocked(rs, holding, 'shadow-form', crew)).toBe(false);
    expect(isAbilityUnlocked(rs, holding, 'ghost-step', crew)).toBe(true);
  });

  it('crew Mastery raises the action cap from 3 to 4', () => {
    const rs = actionRuleset({
      crew: {
        types: [],
        abilities: [
          { id: 'crew-mastery', name: 'Mastery', description: '', effects: { actionMax: 4 } },
        ],
      },
    });
    // An action at 4 is over the base cap (3) without crew, legal with Mastery.
    const at4 = character({ playbook: 'razor', skills: { Clash: 4 } });
    expect(codes(validateCharacter(rs, at4))).toContain('ACTION_OVER_CAP');
    expect(
      codes(validateCharacter(rs, at4, { crew: { crewAbilities: ['crew-mastery'] } }))
    ).not.toContain('ACTION_OVER_CAP');
  });

  it('blocks an incomplete required step', () => {
    const r = validateCharacter(ruleset(), character({ playbook: '' }), { mode: 'creation' });
    expect(codes(r)).toContain('STEP_INCOMPLETE');
  });

  it('skips non-required steps and flags an incomplete required attributes step', () => {
    const rs = ruleset({
      characterCreation: {
        steps: [
          { id: 'special-abilities', name: 'Edges', description: '', order: 1, required: false },
          { id: 'action-ratings', name: 'Ratings', description: '', order: 2, required: true },
        ],
      },
    });
    // Empty attributes → the required attributes step is incomplete; the non-required step is skipped.
    const r = validateCharacter(rs, character({ playbook: 'razor' }), { mode: 'creation' });
    expect(r.errors.filter(e => e.code === 'STEP_INCOMPLETE').map(e => e.field)).toEqual([
      'steps.action-ratings',
    ]);
  });

  it('blocks an incomplete required choice step', () => {
    const rs = ruleset({
      characterCreation: {
        steps: [{ id: 'crew-ties', name: 'Crew Ties', description: '', order: 1, required: true }],
      },
    });
    const r = validateCharacter(rs, character(), { mode: 'creation' });
    expect(codes(r)).toContain('STEP_INCOMPLETE');
    const ok = validateCharacter(rs, character({ custom: { 'crew-ties': 'loyal' } }), {
      mode: 'creation',
    });
    expect(codes(ok)).not.toContain('STEP_INCOMPLETE');
  });

  it('enforces a max restriction and surfaces its message', () => {
    const rs = ruleset({
      characterCreation: {
        steps: [],
        restrictions: [
          {
            field: 'attributes.grit',
            condition: 'max',
            value: 2,
            message: 'Grit cannot exceed 2.',
          },
        ],
      },
    });
    const r = validateCharacter(rs, character({ attributes: { grit: 3 } }), { mode: 'creation' });
    expect(codes(r)).toContain('RESTRICTION');
    expect(r.errors.find(e => e.code === 'RESTRICTION')?.message).toBe('Grit cannot exceed 2.');
  });

  it('warns on an unknown restriction condition', () => {
    const rs = ruleset({
      characterCreation: {
        steps: [],
        restrictions: [{ field: 'attributes.grit', condition: 'wat', value: 1, message: 'x' }],
      },
    });
    const r = validateCharacter(rs, character(), { mode: 'creation' });
    expect(r.isValid).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe('validateCharacter — stress / trauma', () => {
  it('blocks stress beyond the ruleset max', () => {
    const r = validateCharacter(
      ruleset({ stress: { max: 9, traumaMax: 4 } }),
      character({ stress: 10 })
    );
    expect(codes(r)).toContain('STRESS_BOUNDS');
  });
  it('blocks too much trauma', () => {
    const r = validateCharacter(
      ruleset({ stress: { max: 9, traumaMax: 2 } }),
      character({ trauma: ['a', 'b', 'c'] })
    );
    expect(codes(r)).toContain('TRAUMA_OVER');
  });
  it('blocks a trauma not in the ruleset’s named set, and duplicates', () => {
    const rs = ruleset({ traumaConditions: ['Cold', 'Haunted'] });
    expect(codes(validateCharacter(rs, character({ trauma: ['Spooked'] })))).toContain(
      'TRAUMA_UNKNOWN'
    );
    expect(codes(validateCharacter(rs, character({ trauma: ['Cold', 'Cold'] })))).toContain(
      'TRAUMA_DUPLICATE'
    );
    expect(validateCharacter(rs, character({ trauma: ['Cold'] })).isValid).toBe(true);
  });
  it('is lenient (count-only) when the ruleset names no trauma conditions', () => {
    expect(validateCharacter(ruleset(), character({ trauma: ['anything'] })).isValid).toBe(true);
  });
});

describe('effectiveLoadLimit — abilities raise carry capacity', () => {
  it('a Mule-like ability raises the load limit; base holds without it', () => {
    const rs = ruleset({
      equipment: { loadCapacity: { light: 3, normal: 5, heavy: 6 }, items: [], categories: [] },
      specialAbilities: [
        {
          id: 'mule',
          name: 'Mule',
          description: '',
          effects: { loadCapacity: { light: 4, normal: 6, heavy: 9 } },
        },
      ],
    });
    expect(effectiveLoadLimit(rs, character({ specialAbilities: ['mule'] }), 'normal')).toBe(6);
    expect(effectiveLoadLimit(rs, character({ specialAbilities: [] }), 'normal')).toBe(5);
  });
});

describe('validateCharacter — one ability at creation (F11)', () => {
  it('requires at least one special ability when the playbook has a roster', () => {
    const r = validateCharacter(ruleset(), character({ specialAbilities: [] }), {
      mode: 'creation',
    });
    expect(codes(r)).toContain('ABILITY_REQUIRED');
  });
  it('does not require an ability in live mode', () => {
    const r = validateCharacter(ruleset(), character({ specialAbilities: [] }), { mode: 'live' });
    expect(codes(r)).not.toContain('ABILITY_REQUIRED');
  });
});

describe('advancementCost — by category', () => {
  it('resolves by category when no option id matches', () => {
    const rs = ruleset();
    rs.advancement.advancementOptions = [
      { id: 'x', name: 'X', description: '', cost: 4, category: 'attribute' },
    ];
    expect(
      advancementCost(rs, { type: 'attribute', target: 'grit', cost: 1, description: '' })
    ).toBe(4);
  });
});

describe('pointBuySpent — ignores non-positive ratings', () => {
  it('skips attributes set to 0 or below', () => {
    expect(pointBuySpent(ruleset(), { grit: 0, edge: 3 })).toBe(3);
  });
});

describe('isAbilityUnlocked / prerequisites — edge cases', () => {
  it('treats an unknown ability id as unlocked (and never errors on it)', () => {
    expect(isAbilityUnlocked(ruleset(), character(), 'made-up')).toBe(true);
    const r = validateCharacter(ruleset(), character({ specialAbilities: ['made-up'] }), {
      mode: 'creation',
    });
    expect(codes(r)).not.toContain('ABILITY_LOCKED');
  });
  it('treats a free-text prerequisite (not a known ability) as satisfied', () => {
    const rs = ruleset();
    rs.specialAbilities = [
      { id: 'sharpshot', name: 'Sharpshot', description: '', tier: 1, prerequisite: 'a keen eye' },
    ];
    expect(isAbilityUnlocked(rs, character({ specialAbilities: ['sharpshot'] }), 'sharpshot')).toBe(
      true
    );
  });
});

describe('restriction conditions — full matrix', () => {
  const withRestriction = (field: string, condition: string, value: unknown) =>
    ruleset({
      characterCreation: {
        steps: [],
        restrictions: [{ field, condition, value: value as never, message: 'nope' }],
      },
    });

  it('min: violated below the threshold, ok at/above', () => {
    expect(
      codes(
        validateCharacter(
          withRestriction('attributes.grit', 'min', 2),
          character({ attributes: { grit: 1 } }),
          { mode: 'creation' }
        )
      )
    ).toContain('RESTRICTION');
    expect(
      codes(
        validateCharacter(
          withRestriction('attributes.grit', 'min', 2),
          character({ attributes: { grit: 2 } }),
          { mode: 'creation' }
        )
      )
    ).not.toContain('RESTRICTION');
  });
  it('equals: ok when equal, violated otherwise', () => {
    expect(
      codes(
        validateCharacter(
          withRestriction('playbook', 'equals', 'razor'),
          character({ playbook: 'razor' }),
          { mode: 'creation' }
        )
      )
    ).not.toContain('RESTRICTION');
    expect(
      codes(
        validateCharacter(
          withRestriction('playbook', 'equals', 'hawk'),
          character({ playbook: 'razor' }),
          { mode: 'creation' }
        )
      )
    ).toContain('RESTRICTION');
  });
  it('oneOf: ok when the (nested custom) value is in the set', () => {
    const rs = withRestriction('custom.crew-ties', 'oneOf', ['loyal', 'rival']);
    expect(
      codes(
        validateCharacter(rs, character({ custom: { 'crew-ties': 'loyal' } }), { mode: 'creation' })
      )
    ).not.toContain('RESTRICTION');
    expect(
      codes(
        validateCharacter(rs, character({ custom: { 'crew-ties': 'indebted' } }), {
          mode: 'creation',
        })
      )
    ).toContain('RESTRICTION');
  });
  it('required: violated when the field is empty', () => {
    expect(
      codes(
        validateCharacter(withRestriction('vice', 'required', null), character({ vice: '' }), {
          mode: 'creation',
        })
      )
    ).toContain('RESTRICTION');
  });
  it('required: ok when the field is present', () => {
    expect(
      codes(
        validateCharacter(
          withRestriction('vice', 'required', null),
          character({ vice: 'Gambling' }),
          { mode: 'creation' }
        )
      )
    ).not.toContain('RESTRICTION');
  });
  it('max against a non-numeric field is a no-op', () => {
    expect(
      codes(
        validateCharacter(withRestriction('playbook', 'max', 3), character({ playbook: 'razor' }), {
          mode: 'creation',
        })
      )
    ).not.toContain('RESTRICTION');
  });
  it('resolves a missing nested path to undefined (required → violated)', () => {
    expect(
      codes(
        validateCharacter(withRestriction('custom.missing.deep', 'required', null), character(), {
          mode: 'creation',
        })
      )
    ).toContain('RESTRICTION');
  });
});

describe('defensive branches', () => {
  it('defaults an attribute without maxValue to the action-rating cap', () => {
    const rs = ruleset({ attributes: [{ id: 'wits', name: 'Wits', description: '', skills: [] }] });
    const r = validateCharacter(rs, character({ attributes: { wits: 9 } }), { mode: 'creation' });
    expect(codes(r)).toContain('ATTR_OVER_CAP'); // capped at DEFAULT_ATTR_MAX
  });

  it('treats a null field value as empty (required → violated)', () => {
    const rs = ruleset({
      characterCreation: {
        steps: [],
        restrictions: [
          { field: 'custom.x', condition: 'required', value: null as never, message: 'x' },
        ],
      },
    });
    expect(
      codes(validateCharacter(rs, character({ custom: { x: null } }), { mode: 'creation' }))
    ).toContain('RESTRICTION');
  });

  it('does not throw on a structurally-minimal ruleset (missing optional arrays)', () => {
    const bare = {
      metadata: ruleset().metadata,
      playbooks: [],
      specialAbilities: [],
      advancement: {},
    } as unknown as RulesetContent;
    expect(validateCharacter(bare, character(), { mode: 'creation' }).isValid).toBe(true);
  });
});

describe('validateCharacter — live mode is looser than creation', () => {
  it('does not enforce point-buy, ability count, tier gating, or required steps', () => {
    const rs = ruleset({ characterCreation: { steps: [], abilityChoices: 1 } });
    // Over creation budget + more abilities than allowed + a tier-2 ability — all legal post-creation.
    const advanced = character({
      attributes: { grit: 4, edge: 4 },
      specialAbilities: ['battle-born', 'ghost-step'],
    });
    const r = validateCharacter(rs, advanced, { mode: 'live' });
    expect(codes(r)).not.toContain('POINTBUY_OVER');
    expect(codes(r)).not.toContain('ABILITY_LIMIT');
    expect(codes(r)).not.toContain('STEP_INCOMPLETE');
    expect(r.isValid).toBe(true);
  });

  it('still enforces caps and prerequisites in live mode', () => {
    const r = validateCharacter(
      ruleset(),
      character({ attributes: { grit: 9 }, specialAbilities: ['menace'] }),
      {
        mode: 'live',
      }
    );
    expect(codes(r)).toContain('ATTR_OVER_CAP');
    expect(codes(r)).toContain('ABILITY_LOCKED');
  });
});

describe('action ratings', () => {
  it('usesActionRatings reflects the ruleset capability', () => {
    expect(usesActionRatings(actionRuleset())).toBe(true);
    expect(usesActionRatings(ruleset())).toBe(false);
  });

  it('rulesetActions returns the distinct actions across attributes', () => {
    expect(rulesetActions(actionRuleset()).sort()).toEqual(['Clash', 'Rig', 'Skulk', 'Track']);
  });

  it('actionDotsSpent sums action dots (ignoring negatives)', () => {
    const rs = actionRuleset();
    expect(actionDotsSpent(rs, character({ skills: { Clash: 2, Track: 1, Skulk: -3 } }))).toBe(3);
  });

  it('deriveAttributes counts actions rated >= 1 per attribute', () => {
    const rs = actionRuleset();
    const d = deriveAttributes(rs, character({ skills: { Clash: 2, Skulk: 1, Track: 1 } }));
    expect(d).toEqual({ force: 2, cunning: 1 });
  });

  it('passes a legal action build (seeded 1 + 2 points = 3 dots, each <= 2)', () => {
    const rs = actionRuleset();
    const r = validateCharacter(rs, character({ skills: { Clash: 2, Track: 1 } }), {
      mode: 'creation',
    });
    expect(r.isValid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('warns (does not block) when action dots are unspent', () => {
    const rs = actionRuleset();
    const r = validateCharacter(rs, character({ skills: { Clash: 1 } }), { mode: 'creation' });
    expect(r.isValid).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('blocks an over-budget action spread', () => {
    const rs = actionRuleset();
    const r = validateCharacter(rs, character({ skills: { Clash: 2, Track: 1, Rig: 1 } }), {
      mode: 'creation',
    });
    expect(codes(r)).toContain('ACTION_POINTS_OVER');
  });

  it('blocks an action above the at-creation cap, but allows it live (advancement)', () => {
    const rs = actionRuleset();
    const atCreation = validateCharacter(rs, character({ skills: { Clash: 3 } }), {
      mode: 'creation',
    });
    expect(codes(atCreation)).toContain('ACTION_CREATION_CAP');
    const live = validateCharacter(rs, character({ skills: { Clash: 3 } }), { mode: 'live' });
    expect(codes(live)).not.toContain('ACTION_CREATION_CAP');
    expect(codes(live)).not.toContain('ACTION_OVER_CAP');
  });

  it('blocks an action above the absolute max and a negative action (both modes)', () => {
    const rs = actionRuleset();
    expect(
      codes(validateCharacter(rs, character({ skills: { Clash: 4 } }), { mode: 'live' }))
    ).toContain('ACTION_OVER_CAP');
    expect(
      codes(validateCharacter(rs, character({ skills: { Clash: -1 } }), { mode: 'live' }))
    ).toContain('ACTION_NEGATIVE');
  });

  it('does not run attribute point-buy/cap checks in action mode', () => {
    const rs = actionRuleset();
    // A high derived attribute is fine; no ATTR_OVER_CAP / POINTBUY_OVER.
    const r = validateCharacter(rs, character({ skills: { Clash: 1, Track: 1 } }), {
      mode: 'creation',
    });
    expect(codes(r)).not.toContain('ATTR_OVER_CAP');
    expect(codes(r)).not.toContain('POINTBUY_OVER');
  });
});

describe('harm', () => {
  it('harmBounds defaults to BitD (2/2/1) and honors a ruleset override', () => {
    expect(harmBounds(ruleset())).toEqual(DEFAULT_HARM);
    expect(harmBounds(ruleset({ harm: { lesser: 3, moderate: 2, severe: 1 } }))).toEqual({
      lesser: 3,
      moderate: 2,
      severe: 1,
    });
  });

  it('allows harm within bounds and ignores an absent harm track', () => {
    expect(validateCharacter(ruleset(), character(), { mode: 'live' }).isValid).toBe(true);
    const ok = validateCharacter(
      ruleset(),
      character({ harm: { lesser: ['Scraped'], moderate: ['Winded'], severe: [] } }),
      { mode: 'live' }
    );
    expect(ok.isValid).toBe(true);
  });

  it('blocks exceeding a harm level (both modes)', () => {
    const overSevere = character({
      harm: { lesser: [], moderate: [], severe: ['Gutted', 'Broken'] },
    });
    expect(codes(validateCharacter(ruleset(), overSevere, { mode: 'live' }))).toContain(
      'HARM_OVER'
    );
    expect(codes(validateCharacter(ruleset(), overSevere, { mode: 'creation' }))).toContain(
      'HARM_OVER'
    );
  });
});

describe('loadout', () => {
  const loadRs = () =>
    ruleset({
      equipment: {
        loadCapacity: { light: 3, normal: 5, heavy: 6 },
        items: [
          { id: 'blade', name: 'Blade', description: '', load: 1, category: 'w' },
          { id: 'armor', name: 'Armor', description: '', load: 2, category: 'g' },
        ],
        categories: [],
      },
    });

  it('loadLimit uses the ruleset capacity, else BitD defaults', () => {
    expect(loadLimit(loadRs(), 'light')).toBe(3);
    expect(loadLimit(ruleset(), 'heavy')).toBe(6);
  });

  it('loadUsed sums carried item loads', () => {
    expect(
      loadUsed(loadRs(), character({ loadout: { level: 'normal', items: ['blade', 'armor'] } }))
    ).toBe(3);
  });

  it('allows load within the level limit and blocks over it', () => {
    expect(
      validateCharacter(
        loadRs(),
        character({ loadout: { level: 'light', items: ['blade', 'armor'] } }),
        {
          mode: 'live',
        }
      ).isValid
    ).toBe(true);
    const over = validateCharacter(
      loadRs(),
      character({ loadout: { level: 'light', items: ['blade', 'armor', 'blade'] } }),
      { mode: 'live' }
    );
    expect(codes(over)).toContain('LOAD_OVER');
  });

  it('ignores an absent loadout', () => {
    expect(validateCharacter(ruleset(), character(), { mode: 'live' }).isValid).toBe(true);
  });
});

describe('XP tracks', () => {
  // An action-rating ruleset (Force owns Clash/Skulk) that opts into XP tracks.
  const trackRs = () =>
    actionRuleset({
      advancement: {
        xpTracks: { playbook: 8, attribute: 6 },
        xpTriggers: [],
        advancementOptions: [
          { id: 'buy-ability', name: 'Ability', description: '', cost: 8, category: 'ability' },
          { id: 'action-dot', name: 'Action dot', description: '', cost: 6, category: 'skill' },
        ],
      },
    });

  it('usesXpTracks reflects the opt-in', () => {
    expect(usesXpTracks(trackRs())).toBe(true);
    expect(usesXpTracks(actionRuleset())).toBe(false);
  });

  it('xpTrackSize: 0 without tracks, else playbook vs attribute size', () => {
    expect(xpTrackSize(actionRuleset(), PLAYBOOK_TRACK)).toBe(0);
    expect(xpTrackSize(trackRs(), PLAYBOOK_TRACK)).toBe(8);
    expect(xpTrackSize(trackRs(), 'force')).toBe(6);
  });

  it('xpMarks reads playbook + attribute marks, defaulting to 0', () => {
    expect(xpMarks(character(), PLAYBOOK_TRACK)).toBe(0);
    expect(xpMarks(character(), 'force')).toBe(0);
    const c = character({ xp: { playbook: 3, attributes: { force: 2 } } });
    expect(xpMarks(c, PLAYBOOK_TRACK)).toBe(3);
    expect(xpMarks(c, 'force')).toBe(2);
    expect(xpMarks(c, 'cunning')).toBe(0);
  });

  it('xpTrackFull is true only at/over the track size (and false when not opted in)', () => {
    const rs = trackRs();
    expect(
      xpTrackFull(rs, character({ xp: { playbook: 7, attributes: {} } }), PLAYBOOK_TRACK)
    ).toBe(false);
    expect(
      xpTrackFull(rs, character({ xp: { playbook: 8, attributes: {} } }), PLAYBOOK_TRACK)
    ).toBe(true);
    expect(
      xpTrackFull(rs, character({ xp: { playbook: 0, attributes: { force: 6 } } }), 'force')
    ).toBe(true);
    expect(xpTrackFull(actionRuleset(), character(), PLAYBOOK_TRACK)).toBe(false);
  });

  it('advanceTrack routes each advance type to its track', () => {
    const rs = trackRs();
    expect(advanceTrack(rs, { type: 'ability', target: 'x', cost: 0, description: '' })).toBe(
      PLAYBOOK_TRACK
    );
    expect(advanceTrack(rs, { type: 'playbook', target: 'x', cost: 0, description: '' })).toBe(
      PLAYBOOK_TRACK
    );
    expect(advanceTrack(rs, { type: 'attribute', target: 'force', cost: 0, description: '' })).toBe(
      'force'
    );
    // skill → the attribute that owns the action…
    expect(advanceTrack(rs, { type: 'skill', target: 'Clash', cost: 0, description: '' })).toBe(
      'force'
    );
    // …or the playbook track when no attribute owns it.
    expect(advanceTrack(rs, { type: 'skill', target: 'Unknown', cost: 0, description: '' })).toBe(
      PLAYBOOK_TRACK
    );
  });

  it('markXpTrack adds marks, clamped to [0, size], from empty or existing state', () => {
    const rs = trackRs();
    // from empty (no xp yet)
    expect(markXpTrack(rs, character(), PLAYBOOK_TRACK, 2)).toEqual({ playbook: 2, attributes: {} });
    expect(markXpTrack(rs, character(), 'force', 1)).toEqual({ playbook: 0, attributes: { force: 1 } });
    // clamp at the top
    expect(
      markXpTrack(rs, character({ xp: { playbook: 7, attributes: {} } }), PLAYBOOK_TRACK, 5)
    ).toEqual({ playbook: 8, attributes: {} });
    // clamp at the bottom, preserving the other track
    expect(
      markXpTrack(rs, character({ xp: { playbook: 4, attributes: { force: 1 } } }), 'force', -3)
    ).toEqual({ playbook: 4, attributes: { force: 0 } });
  });

  it('clearXpTrack resets one track, preserving the rest (and tolerates absent xp)', () => {
    expect(clearXpTrack(character(), PLAYBOOK_TRACK)).toEqual({ playbook: 0, attributes: {} });
    const c = character({ xp: { playbook: 8, attributes: { force: 6, cunning: 2 } } });
    expect(clearXpTrack(c, PLAYBOOK_TRACK)).toEqual({
      playbook: 0,
      attributes: { force: 6, cunning: 2 },
    });
    expect(clearXpTrack(c, 'force')).toEqual({ playbook: 8, attributes: { force: 0, cunning: 2 } });
  });
});

describe('clampStress', () => {
  const content = {} as RulesetContent; // defaults → BitD 9-stress track

  it('clamps into the ruleset track', () => {
    expect(clampStress(content, -2)).toBe(0);
    expect(clampStress(content, 4)).toBe(4);
    expect(clampStress(content, 99)).toBe(9);
  });
});
