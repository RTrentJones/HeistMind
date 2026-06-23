import { describe, it, expect } from 'vitest';
import { validateRulesetContent, parseAndValidateRuleset } from './ruleset-validation';

const validContent = {
  metadata: { name: 'Test', version: '1.0.0', author: 'A', description: 'D', system: 'FitD' },
  playbooks: [{ id: 'cutter', name: 'Cutter', description: '', startingAbilities: [] }],
  attributes: [{ id: 'insight', name: 'Insight', description: '', skills: [] }],
  skills: [],
  specialAbilities: [],
  equipment: { loadCapacity: {}, items: [], categories: [] },
  advancement: { xpTriggers: [], advancementOptions: [] },
  characterCreation: { steps: [] },
};

describe('validateRulesetContent', () => {
  it('accepts a well-formed ruleset', () => {
    const result = validateRulesetContent(validContent);
    expect(result.ok).toBe(true);
  });

  it('accepts an empty characterCreation.steps array (wizard falls back to defaults)', () => {
    const result = validateRulesetContent({ ...validContent, characterCreation: { steps: [] } });
    expect(result.ok).toBe(true);
  });

  it('rejects a non-object', () => {
    const result = validateRulesetContent('nope');
    expect(result.ok).toBe(false);
  });

  it('rejects missing metadata and playbooks (the malformed-upload case)', () => {
    const { metadata: _m, playbooks: _p, ...rest } = validContent;
    const result = validateRulesetContent(rest);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.includes('metadata'))).toBe(true);
      expect(result.errors.some(e => e.includes('playbooks'))).toBe(true);
    }
  });

  it('rejects empty playbooks/attributes arrays', () => {
    const result = validateRulesetContent({ ...validContent, playbooks: [], attributes: [] });
    expect(result.ok).toBe(false);
  });

  it('rejects playbook entries missing id/name', () => {
    const result = validateRulesetContent({ ...validContent, playbooks: [{ foo: 'bar' }] });
    expect(result.ok).toBe(false);
  });

  it('accepts present, well-formed stress and abilityChoices', () => {
    const result = validateRulesetContent({
      ...validContent,
      stress: { max: 9, traumaMax: 4 },
      characterCreation: { steps: [], abilityChoices: 2 },
    });
    expect(result.ok).toBe(true);
  });

  it('rejects a malformed stress block', () => {
    const result = validateRulesetContent({ ...validContent, stress: { max: 'nine' } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some(e => e.includes('stress'))).toBe(true);
  });

  it('rejects a non-numeric abilityChoices', () => {
    const result = validateRulesetContent({
      ...validContent,
      characterCreation: { steps: [], abilityChoices: 'two' },
    });
    expect(result.ok).toBe(false);
  });
});

describe('parseAndValidateRuleset', () => {
  it('reports invalid JSON', () => {
    const result = parseAndValidateRuleset('{ not json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/Invalid JSON/);
  });

  it('parses + validates a JSON string', () => {
    const result = parseAndValidateRuleset(JSON.stringify(validContent));
    expect(result.ok).toBe(true);
  });
});
