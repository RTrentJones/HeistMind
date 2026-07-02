import { describe, it, expect } from 'vitest';
import type { CharacterData } from '@heist-mind/core';
import { DEFAULT_RULESET } from './default-ruleset';
import { validateRulesetContent } from './ruleset-validation';
import {
  validateCharacter,
  abilityChoiceLimit,
  rulesetActions,
  actionDotsSpent,
  deriveAttributes,
  usesActionRatings,
} from '@heist-mind/core';

const ACTIONS = rulesetActions(DEFAULT_RULESET);
const abilityIds = new Set(DEFAULT_RULESET.specialAbilities.map(a => a.id));

/**
 * A legal creation-time action spread: the playbook's 3 pre-placed dots (seeded) + 4 assigned dots
 * spread one-each across other actions = 7 dots total (BitD), none above the at-creation cap of 2.
 */
function legalSkills(playbookId: string): Record<string, number> {
  const pb = DEFAULT_RULESET.playbooks.find(p => p.id === playbookId)!;
  const skills: Record<string, number> = { ...pb.skills };
  const others = ACTIONS.filter(a => !(a in skills)).slice(0, 4);
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

  it('advances via BitD XP tracks (playbook 8 / attribute 6) with ability + action-dot options', () => {
    expect(DEFAULT_RULESET.advancement.xpTracks).toEqual({ playbook: 8, attribute: 6 });
    const categories = DEFAULT_RULESET.advancement.advancementOptions.map(o => o.category);
    expect(categories).toContain('ability'); // playbook track → a special ability
    expect(categories).toContain('skill'); // attribute track → an action dot
  });

  it('ships crew content: types, crew abilities, and claims', () => {
    const crew = DEFAULT_RULESET.crew;
    expect(crew).toBeTruthy();
    expect((crew?.types.length ?? 0) >= 3).toBe(true);
    expect((crew?.abilities.length ?? 0) >= 3).toBe(true);
    expect((crew?.claims?.length ?? 0) >= 3).toBe(true);
    for (const t of crew?.types ?? []) {
      expect(t.id, t.name).toBeTruthy();
      expect(t.name, t.id).toBeTruthy();
    }
  });

  it('seeds suggested factions with names and in-range tiers', () => {
    const factions = DEFAULT_RULESET.factions ?? [];
    expect(factions.length >= 3).toBe(true);
    for (const f of factions) {
      expect(f.name, JSON.stringify(f)).toBeTruthy();
      expect(f.tier ?? 0, f.name).toBeGreaterThanOrEqual(0);
      expect(f.tier ?? 0, f.name).toBeLessThanOrEqual(6);
    }
  });

  it('every playbook pre-places 3 starting action dots in real actions (max 2 each)', () => {
    for (const pb of DEFAULT_RULESET.playbooks) {
      const entries = Object.entries(pb.skills);
      const total = entries.reduce((n, [, v]) => n + v, 0);
      expect(total, pb.id).toBe(3); // BitD: playbook pre-places 3 dots
      for (const [action, v] of entries) {
        expect(ACTIONS, `${pb.id}:${action}`).toContain(action);
        expect(v, `${pb.id}:${action}`).toBeLessThanOrEqual(2);
      }
    }
  });

  it('every special ability ships resolvable rules text (fuller than its one-liner)', () => {
    for (const ability of DEFAULT_RULESET.specialAbilities) {
      expect(ability.rules, ability.id).toBeTruthy();
      expect((ability.rules ?? '').trim().length, ability.id).toBeGreaterThan(20);
      // The rules text is the full mechanical effect — not a copy of the short description.
      expect(ability.rules, ability.id).not.toBe(ability.description);
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
  it.each(DEFAULT_RULESET.playbooks.map(p => [p.id, p.startingAbilities] as const))(
    'builds a valid creation-time character for "%s"',
    (playbookId, abilities) => {
      const data = buildCharacter(playbookId, [...abilities]);
      const result = validateCharacter(DEFAULT_RULESET, data, { mode: 'creation' });
      expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
      expect(result.isValid).toBe(true);
      // 7 dots (seeded 3 + 4 points), one starting ability, attributes derived (each touched attr ≥ 1).
      expect(actionDotsSpent(DEFAULT_RULESET, data)).toBe(7);
      expect(Object.values(data.attributes).some(v => v > 0)).toBe(true);
    }
  );

  it('rejects an over-budget action spread', () => {
    const skills = legalSkills('knife');
    // Add an 8th dot beyond the 7-dot budget.
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
