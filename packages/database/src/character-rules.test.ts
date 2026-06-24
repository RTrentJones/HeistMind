import { describe, it, expect } from 'vitest';
import type { RulesetContent, CharacterData } from './domain-types';
import {
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
  DEFAULT_STRESS,
  DEFAULT_HARM,
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
    specialAbilities: [],
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

  it('blocks a tier-locked ability even when it has no prerequisite', () => {
    // ghost-step is tier 2, has no prerequisite, and is not in the Razor's roster.
    const rs = ruleset({ characterCreation: { steps: [], abilityChoices: 5 } });
    const r = validateCharacter(rs, character({ specialAbilities: ['ghost-step'] }), {
      mode: 'creation',
    });
    expect(r.errors.find(e => e.code === 'ABILITY_LOCKED')?.message).toMatch(
      /not available at character creation/
    );
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
