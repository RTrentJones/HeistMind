import { describe, it, expect } from 'vitest';
import type { CharacterData } from '@heist-mind/database';
import { DEFAULT_RULESET } from './default-ruleset';
import { validateRulesetContent } from './ruleset-validation';
import { validateCharacter, abilityChoiceLimit } from './character-validation';

// A legal creation-time character for a playbook: a sum-7 attribute spread (each ≤3, satisfying
// the creation restrictions) plus the playbook's first two roster abilities (= abilityChoices 2,
// both unlocked since they're in the chosen playbook's roster).
function buildCharacter(playbookId: string, abilities: string[]): CharacterData {
  return {
    playbook: playbookId,
    attributes: { cunning: 3, force: 2, nerve: 2 },
    skills: {},
    specialAbilities: abilities,
    items: [],
    stress: 0,
    trauma: [],
    coins: 0,
    contacts: [],
    custom: {},
  };
}

const abilityIds = new Set(DEFAULT_RULESET.specialAbilities.map(a => a.id));

describe('DEFAULT_RULESET (Brackwater starter)', () => {
  it('passes the uploaded-ruleset validator', () => {
    const result = validateRulesetContent(DEFAULT_RULESET);
    expect(result.ok).toBe(true);
  });

  it('has the expected FitD shape (3 attributes, 7 playbooks, stress 9/4)', () => {
    expect(DEFAULT_RULESET.attributes.map(a => a.id)).toEqual(['cunning', 'force', 'nerve']);
    expect(DEFAULT_RULESET.playbooks).toHaveLength(7);
    expect(DEFAULT_RULESET.stress).toEqual({ max: 9, traumaMax: 4 });
  });

  it('every playbook ability id resolves to a defined special ability', () => {
    for (const pb of DEFAULT_RULESET.playbooks) {
      for (const id of [...pb.startingAbilities, ...pb.specialAbilities]) {
        expect(abilityIds.has(id), `${pb.id} → ${id}`).toBe(true);
      }
      // Each playbook seeds exactly its signature, and abilityChoices must cover it.
      expect(pb.startingAbilities.length).toBeLessThanOrEqual(
        abilityChoiceLimit(DEFAULT_RULESET, pb.id)
      );
    }
  });

  it('every ability prerequisite names a real ability', () => {
    for (const a of DEFAULT_RULESET.specialAbilities) {
      if (a.prerequisite) expect(abilityIds.has(a.prerequisite), `${a.id} prereq`).toBe(true);
    }
  });

  it('restriction fields reference real attributes', () => {
    const attrIds = new Set(DEFAULT_RULESET.attributes.map(a => a.id));
    for (const r of DEFAULT_RULESET.characterCreation.restrictions ?? []) {
      const [root, key] = r.field.split('.');
      expect(root).toBe('attributes');
      expect(attrIds.has(key ?? '')).toBe(true);
    }
  });

  // The real guard: a minimal legal build for EVERY playbook must validate at creation. This is
  // what proves the bundled content is actually playable through the wizard + rules engine, not
  // merely shape-valid.
  it.each(DEFAULT_RULESET.playbooks.map(p => [p.id, p.specialAbilities.slice(0, 2)] as const))(
    'builds a valid creation-time character for "%s"',
    (playbookId, abilities) => {
      const result = validateCharacter(
        DEFAULT_RULESET,
        buildCharacter(playbookId, [...abilities]),
        {
          mode: 'creation',
        }
      );
      expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
      expect(result.isValid).toBe(true);
    }
  );

  it('rejects an over-budget build (point-buy wired)', () => {
    const over = buildCharacter('knife', ['knife-scarred']);
    over.attributes = { cunning: 3, force: 3, nerve: 3 }; // sum 9 > 7
    const result = validateCharacter(DEFAULT_RULESET, over, { mode: 'creation' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === 'POINTBUY_OVER')).toBe(true);
  });

  it('rejects exceeding the ability-choice limit', () => {
    const tooMany = buildCharacter('knife', [
      'knife-scarred',
      'knife-bulwark',
      'knife-duelist', // 3 > abilityChoices (2)
    ]);
    const result = validateCharacter(DEFAULT_RULESET, tooMany, { mode: 'creation' });
    expect(result.errors.some(e => e.code === 'ABILITY_LIMIT')).toBe(true);
  });

  it('enforces the creation attribute cap (≤3)', () => {
    const overCap = buildCharacter('knife', ['knife-scarred']);
    overCap.attributes = { cunning: 4, force: 2, nerve: 1 }; // sum 7, but cunning 4 > 3
    const result = validateCharacter(DEFAULT_RULESET, overCap, { mode: 'creation' });
    expect(result.errors.some(e => e.code === 'RESTRICTION')).toBe(true);
  });
});
