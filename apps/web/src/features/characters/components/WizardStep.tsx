'use client';

import { usesActionRatings, type Ruleset } from '@heist-mind/core';
import { stepKind, type WizardStepMeta } from '../lib/creation-steps';
import { AbilitiesStep } from './steps/AbilitiesStep';
import { ActionRatingsStep } from './steps/ActionRatingsStep';
import { AttributesStep } from './steps/AttributesStep';
import { ChoiceStep } from './steps/ChoiceStep';
import { IdentityStep } from './steps/IdentityStep';
import { PlaybookStep } from './steps/PlaybookStep';
import { ReviewStep } from './steps/ReviewStep';

/**
 * Dispatches a step's normalized kind to the matching component. Unrecognized
 * (custom GM) steps fall through to the generic, options-driven `ChoiceStep`.
 */
export function WizardStep({ step, ruleset }: { step: WizardStepMeta; ruleset: Ruleset }) {
  switch (stepKind(step.id)) {
    case 'playbook':
      return <PlaybookStep />;
    case 'attributes':
      return usesActionRatings(ruleset.content) ? <ActionRatingsStep /> : <AttributesStep />;
    case 'abilities':
      return <AbilitiesStep />;
    case 'identity': {
      const full = ruleset.content.characterCreation?.steps?.find(s => s.id === step.id);
      return <IdentityStep step={full} />;
    }
    case 'review':
      return <ReviewStep />;
    default: {
      const full = ruleset.content.characterCreation?.steps?.find(s => s.id === step.id);
      return <ChoiceStep step={full} />;
    }
  }
}
