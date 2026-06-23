import type { Ruleset, CharacterData } from '@heist-mind/database';

/**
 * The wizard is RULESET-DRIVEN: the steps come from
 * `ruleset.content.characterCreation.steps`. Each step has a free-form `id`,
 * so we normalize that id to a known "kind" to pick the right step component.
 * Anything we don't recognize falls back to the generic `choice` renderer,
 * which is driven entirely by the step's own `options` — so a custom GM
 * ruleset with novel steps still renders something useful.
 */
export type StepKind = 'playbook' | 'attributes' | 'abilities' | 'identity' | 'review' | 'choice';

export function stepKind(id: string): StepKind {
  const s = id.toLowerCase();
  if (s.includes('playbook') || s.includes('class') || s.includes('archetype')) return 'playbook';
  if (s.includes('attribute') || s.includes('action') || s.includes('rating')) return 'attributes';
  if (s.includes('abilit') || s.includes('special') || s.includes('move') || s.includes('power'))
    return 'abilities';
  if (
    s.includes('identity') ||
    s.includes('heritage') ||
    s.includes('background') ||
    s.includes('vice') ||
    s.includes('detail')
  )
    return 'identity';
  if (s.includes('review') || s.includes('confirm') || s.includes('summary')) return 'review';
  return 'choice';
}

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
