// The wizard store's budget math + pick semantics — the rules-legality the wizard enforces
// per-click, exercised against small fixture rulesets (no DB, no components).
import { beforeEach, describe, expect, it } from 'vitest';
import type { Ruleset, RulesetContent } from '@heist-mind/core';
import { useCharacterCreationStore } from '../character-creation-store';

const asRuleset = (content: RulesetContent): Ruleset =>
  ({ id: 'rs1', name: content.metadata.name, version: '1', content }) as unknown as Ruleset;

/** Point-buy mode: 5 points, escalating costs (rating 4 is deliberately unaffordable). */
const POINT_BUY = asRuleset({
  metadata: { name: 'PB', version: '1', author: '', description: '', system: 'fitd' },
  playbooks: [
    {
      id: 'cutter',
      name: 'Cutter',
      description: '',
      startingAbilities: ['iron-will'],
      specialAbilities: ['iron-will', 'vigorous'],
      contacts: [],
      equipment: [],
      attributes: {},
      skills: {},
    },
  ],
  attributes: [
    { id: 'insight', name: 'Insight', description: '', maxValue: 4 },
    { id: 'prowess', name: 'Prowess', description: '', maxValue: 4 },
  ],
  specialAbilities: [
    { id: 'iron-will', name: 'Iron Will', description: '', tier: 1 },
    { id: 'vigorous', name: 'Vigorous', description: '', tier: 1 },
    { id: 'ghost-step', name: 'Ghost Step', description: '', tier: 2 },
  ],
  characterCreation: {
    steps: [],
    pointBuy: { totalPoints: 5, attributeCosts: { 1: 1, 2: 2, 3: 4, 4: 7 } },
    abilityChoices: 1,
  },
} as unknown as RulesetContent);

/** Action-rating mode: 2 creation points on top of the playbook's 1 seeded dot; caps 3/2. */
const ACTION_MODE = asRuleset({
  metadata: { name: 'AR', version: '1', author: '', description: '', system: 'fitd' },
  playbooks: [
    {
      id: 'knife',
      name: 'The Knife',
      description: '',
      startingAbilities: [],
      specialAbilities: [],
      contacts: [],
      equipment: [],
      attributes: {},
      skills: { hunt: 1 },
    },
  ],
  attributes: [
    { id: 'insight', name: 'Insight', description: '', skills: ['hunt', 'study'] },
    { id: 'prowess', name: 'Prowess', description: '', skills: ['skirmish', 'prowl'] },
  ],
  skills: [
    { id: 'hunt', name: 'Hunt', description: '', attribute: 'insight' },
    { id: 'study', name: 'Study', description: '', attribute: 'insight' },
    { id: 'skirmish', name: 'Skirmish', description: '', attribute: 'prowess' },
    { id: 'prowl', name: 'Prowl', description: '', attribute: 'prowess' },
  ],
  characterCreation: {
    steps: [],
    actionRatings: { points: 2, max: 3, maxAtCreation: 2 },
  },
} as unknown as RulesetContent);

const store = () => useCharacterCreationStore.getState();

beforeEach(() => {
  store().reset();
});

describe('point-buy affordability (setAttribute)', () => {
  beforeEach(() => {
    store().initFromRuleset(POINT_BUY);
    store().setPlaybook('cutter');
  });

  it('clamps a raise to the highest rating the remaining points afford', () => {
    // Rating 4 costs 7 > 5 total points → the best affordable is 3 (cost 4).
    store().setAttribute('insight', 4);
    expect(store().draft.attributes.insight).toBe(3);
  });

  it('accounts for what the OTHER attributes already cost', () => {
    store().setAttribute('insight', 3); // spends 4 of 5
    store().setAttribute('prowess', 3); // only 1 point left → clamps to 1
    expect(store().draft.attributes.prowess).toBe(1);
  });

  it('never goes below zero', () => {
    store().setAttribute('insight', -2);
    expect(store().draft.attributes.insight).toBe(0);
  });
});

describe('action-dot budget (setActionRating)', () => {
  beforeEach(() => {
    store().initFromRuleset(ACTION_MODE);
    store().setPlaybook('knife');
  });

  it('seeds the playbook baseline and derives attributes from rated actions', () => {
    expect(store().draft.skills.hunt).toBe(1);
    // Derived: insight has one action rated ≥1 (hunt).
    expect(store().draft.attributes.insight).toBe(1);
    expect(store().draft.attributes.prowess).toBe(0);
  });

  it('caps a single action at the at-creation cap', () => {
    // Budget is seeded(1) + points(2) = 3, but the per-action creation cap is 2.
    store().setActionRating('skirmish', 5);
    expect(store().draft.skills.skirmish).toBe(2);
  });

  it('clamps to the remaining dot budget across actions', () => {
    store().setActionRating('skirmish', 2); // spent: hunt 1 + skirmish 2 = 3 of 3
    store().setActionRating('prowl', 2); // nothing left
    expect(store().draft.skills.prowl).toBe(0);
    store().setActionRating('hunt', 0); // free a dot
    store().setActionRating('prowl', 2); // one dot affordable now
    expect(store().draft.skills.prowl).toBe(1);
  });

  it('re-derives attributes as dots move', () => {
    store().setActionRating('skirmish', 2);
    expect(store().draft.attributes.prowess).toBe(1); // one prowess action rated
    store().setActionRating('prowl', 0); // still just skirmish
    expect(store().draft.attributes.prowess).toBe(1);
  });
});

describe('ability picks (toggleAbility)', () => {
  it('single-slot (BitD) is a RADIO: swap, keep-on-reclick, never empty', () => {
    store().initFromRuleset(POINT_BUY);
    store().setPlaybook('cutter');
    expect(store().draft.specialAbilities).toEqual(['iron-will']); // seeded

    store().toggleAbility('vigorous'); // swap
    expect(store().draft.specialAbilities).toEqual(['vigorous']);

    store().toggleAbility('vigorous'); // re-click keeps it (can't drop to zero)
    expect(store().draft.specialAbilities).toEqual(['vigorous']);
  });

  it('a locked (tier-2 cross-playbook, no veteran) ability is a no-op', () => {
    store().initFromRuleset(POINT_BUY);
    store().setPlaybook('cutter');
    store().toggleAbility('ghost-step');
    expect(store().draft.specialAbilities).toEqual(['iron-will']);
  });
});

describe('resume + reset', () => {
  it('initFromRuleset with the SAME (gameId, rulesetId) keeps the in-progress draft', () => {
    store().initFromRuleset(POINT_BUY);
    store().setPlaybook('cutter');
    store().setName('Silks');
    store().initFromRuleset(POINT_BUY); // e.g. a remount re-supplying the ruleset
    expect(store().name).toBe('Silks');
    expect(store().draft.playbook).toBe('cutter');
  });

  it('reset clears the draft', () => {
    store().initFromRuleset(POINT_BUY);
    store().setName('Silks');
    store().reset();
    expect(store().name).toBe('');
    expect(store().draft.playbook).toBe('');
  });
});
