import { describe, it, expect } from 'vitest';
import type { CharacterData } from '@heist-mind/database';
import { DEFAULT_RULESET } from './default-ruleset';
import { validateRulesetContent } from './ruleset-validation';
import {
  validateCharacter,
  abilityChoiceLimit,
  rulesetActions,
  actionDotsSpent,
  deriveAttributes,
  usesActionRatings,
} from './character-validation';

const ACTIONS = rulesetActions(DEFAULT_RULESET);
const abilityIds = new Set(DEFAULT_RULESET.specialAbilities.map(a => a.id));

/**
 * A legal creation-time action spread for a playbook: raise the playbook's seeded action to 2,
 * then add 1 to three other actions = 5 dots total (seeded 1 + the ruleset's 4 creation points),
 * none above the at-creation cap of 2.
 */
function legalSkills(playbookId: string): Record<string, number> {
  const pb = DEFAULT_RULESET.playbooks.find(p => p.id === playbookId)!;
  const seeded = Object.keys(pb.skills)[0]!;
  const others = ACTIONS.filter(a => a !== seeded).slice(0, 3);
  const skills: Record<string, number> = { [seeded]: 2 };
  for (const a of others) skills[a] = 1;
  return skills;
}

function buildCharacter(
  playbookId: string,
  abilities: string[],
  skills = legalSkills(playbookId)
): CharacterData {
  const base: CharacterData = {
    playbook: playbookId,
    attributes: {},
    skills,
    specialAbilities: abilities,
    items: [],
    stress: 0,
    trauma: [],
    coins: 0,
    contacts: [],
    custom: {},
  };
  return { ...base, attributes: deriveAttributes(DEFAULT_RULESET, base) };
}

describe('DEFAULT_RULESET (Brackwater starter)', () => {
  it('passes the uploaded-ruleset validator', () => {
    expect(validateRulesetContent(DEFAULT_RULESET).ok).toBe(true);
  });

  it('is an action-rating FitD ruleset (3 attributes / 12 actions, stress 9/4)', () => {
    expect(usesActionRatings(DEFAULT_RULESET)).toBe(true);
    expect(DEFAULT_RULESET.attributes.map(a => a.id)).toEqual(['cunning', 'force', 'nerve']);
    expect(ACTIONS).toHaveLength(12);
    expect(DEFAULT_RULESET.stress).toEqual({ max: 9, traumaMax: 4 });
    expect(DEFAULT_RULESET.characterCreation.actionRatings).toEqual({
      points: 4,
      maxAtCreation: 2,
      max: 3,
    });
  });

  it('every playbook seeds exactly one starting action dot that is a real action', () => {
    for (const pb of DEFAULT_RULESET.playbooks) {
      const keys = Object.keys(pb.skills);
      expect(keys, pb.id).toHaveLength(1);
      expect(ACTIONS).toContain(keys[0]);
      expect(pb.skills[keys[0]!]).toBe(1);
    }
  });

  it('every playbook ability id resolves to a defined special ability', () => {
    for (const pb of DEFAULT_RULESET.playbooks) {
      for (const id of [...pb.startingAbilities, ...pb.specialAbilities]) {
        expect(abilityIds.has(id), `${pb.id} → ${id}`).toBe(true);
      }
      expect(pb.startingAbilities.length).toBeLessThanOrEqual(
        abilityChoiceLimit(DEFAULT_RULESET, pb.id)
      );
    }
  });

  // The real guard: a minimal legal build for EVERY playbook validates at creation, and its
  // derived attributes match the action spread.
  it.each(DEFAULT_RULESET.playbooks.map(p => [p.id, p.specialAbilities.slice(0, 2)] as const))(
    'builds a valid creation-time character for "%s"',
    (playbookId, abilities) => {
      const data = buildCharacter(playbookId, [...abilities]);
      const result = validateCharacter(DEFAULT_RULESET, data, { mode: 'creation' });
      expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
      expect(result.isValid).toBe(true);
      // 5 dots assigned (seeded 1 + 4 points), and attributes are derived (each touched attr ≥ 1).
      expect(actionDotsSpent(DEFAULT_RULESET, data)).toBe(5);
      expect(Object.values(data.attributes).some(v => v > 0)).toBe(true);
    }
  );

  it('rejects an over-budget action spread', () => {
    const skills = legalSkills('knife');
    // Add a 6th dot beyond the 5-dot budget.
    const extra = ACTIONS.find(a => !(a in skills))!;
    skills[extra] = 1;
    const result = validateCharacter(
      DEFAULT_RULESET,
      buildCharacter('knife', ['knife-scarred'], skills),
      {
        mode: 'creation',
      }
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === 'ACTION_POINTS_OVER')).toBe(true);
  });

  it('rejects an action above the at-creation cap (2)', () => {
    const skills = { [Object.keys(DEFAULT_RULESET.playbooks[0]!.skills)[0]!]: 3 } as Record<
      string,
      number
    >;
    const result = validateCharacter(
      DEFAULT_RULESET,
      buildCharacter('knife', ['knife-scarred'], skills),
      {
        mode: 'creation',
      }
    );
    expect(result.errors.some(e => e.code === 'ACTION_CREATION_CAP')).toBe(true);
  });

  it('rejects exceeding the ability-choice limit', () => {
    const data = buildCharacter('knife', ['knife-scarred', 'knife-bulwark', 'knife-duelist']);
    const result = validateCharacter(DEFAULT_RULESET, data, { mode: 'creation' });
    expect(result.errors.some(e => e.code === 'ABILITY_LIMIT')).toBe(true);
  });
});
