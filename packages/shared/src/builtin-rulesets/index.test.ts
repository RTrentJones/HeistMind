import { describe, it, expect } from 'vitest';
import type { CharacterData, RulesetContent } from '@heist-mind/core';
import { BUILTIN_RULESETS, getBuiltinById } from './index';
import { validateRulesetContent } from '../ruleset-validation';
import {
  validateCharacter,
  abilityChoiceLimit,
  rulesetActions,
  actionDotsSpent,
  deriveAttributes,
  usesActionRatings,
} from '@heist-mind/core';

/**
 * A legal creation-time action spread for an action-rating ruleset: raise the playbook's seeded
 * action and then other actions up to the at-creation cap until the point budget is spent. Total
 * dots = (seeded dots) + points, which is exactly what the engine allows.
 */
function legalSkills(ruleset: RulesetContent, playbookId: string): Record<string, number> {
  const ar = ruleset.characterCreation.actionRatings!;
  const actions = rulesetActions(ruleset);
  const pb = ruleset.playbooks.find(p => p.id === playbookId)!;
  const seededKey = Object.keys(pb.skills)[0]!;
  const skills: Record<string, number> = { ...pb.skills };
  let remaining = ar.points;
  for (const a of [seededKey, ...actions.filter(x => x !== seededKey)]) {
    while ((skills[a] ?? 0) < ar.maxAtCreation && remaining > 0) {
      skills[a] = (skills[a] ?? 0) + 1;
      remaining -= 1;
    }
    if (remaining === 0) break;
  }
  return skills;
}

function buildCharacter(
  ruleset: RulesetContent,
  playbookId: string,
  abilities: string[]
): CharacterData {
  const base: CharacterData = {
    playbook: playbookId,
    attributes: {},
    skills: legalSkills(ruleset, playbookId),
    specialAbilities: abilities,
    items: [],
    stress: 0,
    trauma: [],
    coins: 0,
    contacts: [],
    custom: {},
  };
  return { ...base, attributes: deriveAttributes(ruleset, base) };
}

describe('BUILTIN_RULESETS catalog', () => {
  it('has a brackwater starter first and unique ids/names', () => {
    expect(BUILTIN_RULESETS[0]?.id).toBe('brackwater');
    const ids = BUILTIN_RULESETS.map(b => b.id);
    const names = BUILTIN_RULESETS.map(b => b.content.metadata.name);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('getBuiltinById resolves entries and returns undefined for unknown ids', () => {
    expect(getBuiltinById('blades-in-the-dark')?.content.metadata.name).toBe('Blades in the Dark');
    expect(getBuiltinById('nope')).toBeUndefined();
  });

  it('records an attribution notice for every openly-licensed (non-original) entry', () => {
    for (const b of BUILTIN_RULESETS) {
      if (b.license && b.license !== 'Original' && b.license !== 'CC0') {
        expect(b.attribution, b.id).toBeTruthy();
      }
    }
  });

  describe.each(BUILTIN_RULESETS.map(b => [b.id, b] as const))('%s', (_id, builtin) => {
    const ruleset = builtin.content;

    it('passes the uploaded-ruleset validator', () => {
      const result = validateRulesetContent(ruleset);
      expect(result.ok, JSON.stringify(result)).toBe(true);
    });

    it('is an action-rating FitD ruleset (3 attributes / 12 actions, stress 9/4)', () => {
      expect(usesActionRatings(ruleset)).toBe(true);
      expect(ruleset.attributes).toHaveLength(3);
      expect(rulesetActions(ruleset)).toHaveLength(12);
      expect(ruleset.stress).toEqual({ max: 9, traumaMax: 4 });
    });

    it('every playbook ability id resolves, and starting abilities fit the choice limit', () => {
      const abilityIds = new Set(ruleset.specialAbilities.map(a => a.id));
      for (const pb of ruleset.playbooks) {
        for (const id of [...pb.startingAbilities, ...pb.specialAbilities]) {
          expect(abilityIds.has(id), `${pb.id} → ${id}`).toBe(true);
        }
        expect(pb.startingAbilities.length).toBeLessThanOrEqual(abilityChoiceLimit(ruleset, pb.id));
      }
    });

    it('every special ability ships resolvable rules text distinct from its one-liner', () => {
      for (const ability of ruleset.specialAbilities) {
        expect((ability.rules ?? '').trim().length, ability.id).toBeGreaterThan(20);
        expect(ability.rules, ability.id).not.toBe(ability.description);
      }
    });

    it('seeds suggested factions with in-range tiers', () => {
      for (const f of ruleset.factions ?? []) {
        expect(f.name, JSON.stringify(f)).toBeTruthy();
        expect(f.tier ?? 0, f.name).toBeGreaterThanOrEqual(0);
        expect(f.tier ?? 0, f.name).toBeLessThanOrEqual(6);
      }
    });

    it('any crew resource pools are well-formed (max > 0, startsAt within range)', () => {
      for (const pool of ruleset.crew?.resourcePools ?? []) {
        expect(pool.id && pool.name, JSON.stringify(pool)).toBeTruthy();
        expect(pool.max, pool.id).toBeGreaterThan(0);
        const start = pool.startsAt ?? 0;
        expect(start, pool.id).toBeGreaterThanOrEqual(0);
        expect(start, pool.id).toBeLessThanOrEqual(pool.max);
      }
    });

    it('builds a valid creation-time character for every playbook', () => {
      for (const pb of ruleset.playbooks) {
        const data = buildCharacter(ruleset, pb.id, [...pb.startingAbilities]);
        const result = validateCharacter(ruleset, data, { mode: 'creation' });
        expect(result.errors, `${pb.id}: ${JSON.stringify(result.errors)}`).toEqual([]);
        expect(result.isValid, pb.id).toBe(true);
        // Total dots spent = seeded dots + the creation point budget.
        const seeded = Object.values(pb.skills).reduce((a, b) => a + b, 0);
        expect(actionDotsSpent(ruleset, data), pb.id).toBe(
          seeded + ruleset.characterCreation.actionRatings!.points
        );
      }
    });
  });
});
