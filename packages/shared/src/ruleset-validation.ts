// Lightweight, game-agnostic validation for an uploaded FitD ruleset.
//
// Validates the `RulesetContent` invariants the character-creation wizard depends
// on — it is intentionally NOT a full schema check (content is stored as JSONB and
// the wizard reads what it needs). Returns either the typed content or a flat list
// of human-readable errors for the upload UI to display.
import type { RulesetContent } from '@heist-mind/database';

export type RulesetValidationResult =
  | { ok: true; content: RulesetContent }
  | { ok: false; errors: string[] };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasIdAndName(entry: unknown): boolean {
  return isObject(entry) && typeof entry.id === 'string' && typeof entry.name === 'string';
}

/** Validate already-parsed JSON as `RulesetContent`. */
export function validateRulesetContent(input: unknown): RulesetValidationResult {
  const errors: string[] = [];

  if (!isObject(input)) {
    return { ok: false, errors: ['Ruleset must be a JSON object.'] };
  }
  const content = input;

  // metadata
  const meta = content.metadata;
  if (!isObject(meta)) {
    errors.push('metadata is required and must be an object.');
  } else {
    for (const field of ['name', 'version', 'author', 'description', 'system'] as const) {
      const value = meta[field];
      if (typeof value !== 'string' || value.trim() === '') {
        errors.push(`metadata.${field} is required (non-empty string).`);
      }
    }
  }

  // playbooks (the wizard's first step needs at least one)
  if (!Array.isArray(content.playbooks) || content.playbooks.length === 0) {
    errors.push('playbooks must be a non-empty array.');
  } else {
    content.playbooks.forEach((p, i) => {
      if (!hasIdAndName(p)) errors.push(`playbooks[${i}] must have a string id and name.`);
    });
  }

  // attributes (the allocator step needs at least one)
  if (!Array.isArray(content.attributes) || content.attributes.length === 0) {
    errors.push('attributes must be a non-empty array.');
  } else {
    content.attributes.forEach((a, i) => {
      if (!hasIdAndName(a)) errors.push(`attributes[${i}] must have a string id and name.`);
    });
  }

  // characterCreation.steps drives the wizard; the array may be empty (→ defaults)
  const creation = content.characterCreation;
  if (!isObject(creation)) {
    errors.push('characterCreation is required and must be an object.');
  } else {
    if (!Array.isArray(creation.steps)) {
      errors.push('characterCreation.steps must be an array (it may be empty).');
    }
    // abilityChoices is optional, but must be a number when present
    if (creation.abilityChoices !== undefined && typeof creation.abilityChoices !== 'number') {
      errors.push('characterCreation.abilityChoices must be a number when present.');
    }
    // pointBuy.attributeCosts values must be numeric when present (drives the budget)
    if (isObject(creation.pointBuy) && isObject(creation.pointBuy.attributeCosts)) {
      const bad = Object.values(creation.pointBuy.attributeCosts).some(v => typeof v !== 'number');
      if (bad) errors.push('characterCreation.pointBuy.attributeCosts values must be numbers.');
    }
  }

  // specialAbilities is optional, but must be an array when present
  if (content.specialAbilities !== undefined && !Array.isArray(content.specialAbilities)) {
    errors.push('specialAbilities must be an array when present.');
  }

  // stress is optional, but { max, traumaMax } must be numbers when present
  if (content.stress !== undefined) {
    const stress = content.stress;
    if (
      !isObject(stress) ||
      typeof stress.max !== 'number' ||
      typeof stress.traumaMax !== 'number'
    ) {
      errors.push('stress must be an object with numeric max and traumaMax when present.');
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, content: input as unknown as RulesetContent };
}

/** Parse a JSON string and validate it as `RulesetContent`. */
export function parseAndValidateRuleset(raw: string): RulesetValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return {
      ok: false,
      errors: [`Invalid JSON: ${e instanceof Error ? e.message : 'could not parse'}`],
    };
  }
  return validateRulesetContent(parsed);
}
