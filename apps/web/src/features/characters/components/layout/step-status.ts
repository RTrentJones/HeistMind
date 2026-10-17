/**
 * One status model for every wizard stepper (the Badge pills and the rail) — F93. Green means
 * DONE, so it is reserved for steps the user has passed AND that validate; a step ahead of the
 * current one is never green, even if a default already satisfies it.
 *
 * - `current`    — the step on screen.
 * - `complete`   — visited (before the current step) and valid.
 * - `incomplete` — visited but still invalid (needs attention).
 * - `upcoming`   — not reached yet.
 */
export type StepStatus = 'current' | 'complete' | 'incomplete' | 'upcoming';

export function stepStatus(index: number, currentIndex: number, valid: boolean): StepStatus {
  if (index === currentIndex) return 'current';
  if (index > currentIndex) return 'upcoming';
  return valid ? 'complete' : 'incomplete';
}

/** i18n key (components.wizardSteps.*) for the screen-reader status suffix of a step. */
export const STEP_STATUS_KEY = {
  current: 'components.wizardSteps.current',
  complete: 'components.wizardSteps.complete',
  incomplete: 'components.wizardSteps.incomplete',
  upcoming: 'components.wizardSteps.upcoming',
} as const satisfies Record<StepStatus, string>;
