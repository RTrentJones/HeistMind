import { describe, it, expect } from 'vitest';
import type { RulesetContent, CharacterData } from './domain-types';
import {
  validateCharacter,
  pointBuySpent,
  abilityChoiceLimit,
  isAbilityUnlocked,
  stressBounds,
  advancementCost,
  DEFAULT_STRESS,
} from './character-rules';

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

  it('blocks an incomplete required step', () => {
    const r = validateCharacter(ruleset(), character({ playbook: '' }), { mode: 'creation' });
    expect(codes(r)).toContain('STEP_INCOMPLETE');
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
