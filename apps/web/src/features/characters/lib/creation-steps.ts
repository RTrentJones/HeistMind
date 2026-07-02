import { stepKind, type StepKind, type Ruleset, type CharacterData } from '@heist-mind/core';

/**
 * The wizard is RULESET-DRIVEN: steps come from `ruleset.content.characterCreation.steps`. Each
 * step has a free-form `id` normalized to a known "kind" (via the canonical `stepKind` in
 * @heist-mind/database, shared with the validator) to pick the right step component. Unrecognized
 * ids fall back to the generic `choice` renderer, driven by the step's own `options`.
 */
export { stepKind, type StepKind };

/** Lightweight, serializable step metadata for the stepper + navigation. */
export interface WizardStepMeta {
  id: string;
  name: string;
  description: string;
  required: boolean;
}

/** Used when a ruleset doesn't define its own creation steps. */
export const DEFAULT_STEPS: WizardStepMeta[] = [
  { id: 'playbook', name: 'Playbook', description: 'Choose your character type', required: true },
  {
    id: 'attributes',
    name: 'Attributes',
    description: 'Allocate your action ratings',
    required: true,
  },
  {
    id: 'abilities',
    name: 'Special Abilities',
    description: 'Pick your starting abilities',
    required: false,
  },
  {
    id: 'identity',
    name: 'Identity',
    description: 'Heritage, background, and vice',
    required: false,
  },
  { id: 'review', name: 'Review', description: 'Confirm and create', required: true },
];

/**
 * Derive the ordered step list for a ruleset. Honors GM-defined steps when
 * present (sorted by `order`), otherwise falls back to a sensible default.
 * Always guarantees a final `review` step.
 */
export function deriveSteps(ruleset: Ruleset): WizardStepMeta[] {
  const defined = ruleset.content?.characterCreation?.steps ?? [];
  let steps: WizardStepMeta[];

  if (defined.length > 0) {
    steps = [...defined]
      .sort((a, b) => a.order - b.order)
      .map(s => ({ id: s.id, name: s.name, description: s.description, required: s.required }));
  } else {
    steps = [...DEFAULT_STEPS];
  }

  if (!steps.some(s => stepKind(s.id) === 'review')) {
    steps.push({ id: 'review', name: 'Review', description: 'Confirm and create', required: true });
  }
  return steps;
}

/** A fresh, fully-typed empty character draft. */
export function emptyDraft(): CharacterData {
  return {
    playbook: '',
    heritage: '',
    background: '',
    vice: '',
    attributes: {},
    skills: {},
    specialAbilities: [],
    items: [],
    stress: 0,
    trauma: [],
    coins: 0,
    contacts: [],
    custom: {},
  };
}
