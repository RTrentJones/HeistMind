import { describe, it, expect } from 'vitest';
import { validateCharacter, pointBuySpent, stepKind } from './character-validation';
import type { RulesetContent, CharacterData } from '@heist-mind/database';

// Smoke test: the shared surface re-exports the canonical rules from @heist-mind/database.
// Exhaustive rule coverage lives in packages/database/src/character-rules.test.ts.

const ruleset: RulesetContent = {
  metadata: { name: 'T', version: '1.0.0', author: 'A', description: 'D', system: 'FitD' },
  playbooks: [
    {
      id: 'razor',
      name: 'Razor',
      description: '',
      startingAbilities: ['battle-born'],
      specialAbilities: ['battle-born'],
      contacts: [],
      equipment: [],
      attributes: {},
      skills: {},
    },
  ],
  attributes: [{ id: 'grit', name: 'Grit', description: '', skills: [], maxValue: 4 }],
  skills: [],
  specialAbilities: [{ id: 'battle-born', name: 'Battle-Born', description: '', tier: 1 }],
  equipment: { loadCapacity: {}, items: [], categories: [] },
  advancement: { xpTriggers: [], advancementOptions: [] },
  characterCreation: {
    steps: [],
    pointBuy: { totalPoints: 7, attributeCosts: { 1: 1, 2: 2 }, skillCosts: {} },
  },
};

const character: CharacterData = {
  playbook: 'razor',
  attributes: { grit: 2 },
  skills: {},
  specialAbilities: ['battle-born'],
  items: [],
  stress: 0,
  trauma: [],
  coins: 0,
  contacts: [],
  custom: {},
};

describe('shared re-export of character rules', () => {
  it('validateCharacter is callable and validates a legal build', () => {
    expect(validateCharacter(ruleset, character, { mode: 'creation' }).isValid).toBe(true);
  });
  it('pointBuySpent + stepKind are re-exported', () => {
    expect(pointBuySpent(ruleset, { grit: 2 })).toBe(2);
    expect(stepKind('choose-playbook')).toBe('playbook');
  });
});
