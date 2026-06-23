'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import type { Ruleset } from '@heist-mind/database';
import { Badge, Button, Heading, Input, Text } from '@heist-mind/ui';
import { useCharacterCreationStore } from '../stores/character-creation-store';
import { WizardStep } from './WizardStep';

interface CharacterCreationWizardProps {
  ruleset: Ruleset;
  gameId: string;
  /** Called with the new character id after a successful create. */
  onComplete?: (characterId: string) => void;
  onCancel?: () => void;
}

/**
 * Ruleset-driven character creation wizard (single-column layout).
 *
 * Presentation is ported from the Claude Design `character-creator-spec`
 * template (see `../design/`): persistent name field, Badge stepper, step
 * heading, and a fixed translucent footer with Cancel / Back / Next|Create.
 * The data layer (steps, draft, submit → repository) lives in the store.
 */
export function CharacterCreationWizard({
  ruleset,
  gameId,
  onComplete,
  onCancel,
}: CharacterCreationWizardProps) {
  const router = useRouter();
  const {
    steps,
    stepIndex,
    name,
    isLoading,
    init,
    setName,
    goNext,
    goBack,
    goToStep,
    isStepValid,
    submit,
  } = useCharacterCreationStore(
    useShallow(s => ({
      steps: s.steps,
      stepIndex: s.stepIndex,
      name: s.name,
      isLoading: s.isLoading,
      init: s.initFromRuleset,
      setName: s.setName,
      goNext: s.goNext,
      goBack: s.goBack,
      goToStep: s.goToStep,
      isStepValid: s.isStepValid,
      submit: s.submit,
    }))
  );

  useEffect(() => {
    init(ruleset, gameId);
  }, [ruleset, gameId, init]);

  const step = steps[stepIndex];
  if (!step) return null;

  const isLast = stepIndex === steps.length - 1;
  const canAdvance = isStepValid(stepIndex);

  const handleFinish = async () => {
    const id = await submit();
    if (id) {
      if (onComplete) onComplete(id);
      else router.push(`/games/${gameId}`);
    }
  };

  return (
    <div className="mx-auto" style={{ maxWidth: 900, padding: '36px clamp(20px,4vw,32px) 130px' }}>
      {/* Character name — persistent, required */}
      <div style={{ marginBottom: 26, maxWidth: 460 }}>
        <Input
          label="Character name"
          required
          placeholder="e.g. Shadows McKenzie"
          value={name}
          onChange={e => setName(e.target.value)}
          helpText="Required — shown on the character sheet."
        />
      </div>

      {/* Stepper — Badge isn't clickable on its own, so wrap in a button */}
      <div
        className="flex flex-wrap gap-2"
        style={{ marginBottom: 30 }}
        role="tablist"
        aria-label="Creation steps"
      >
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goToStep(i)}
            aria-current={i === stepIndex}
            className="cursor-pointer border-0 bg-transparent p-0"
          >
            <Badge variant={i === stepIndex ? 'ember' : isStepValid(i) ? 'success' : 'outline'}>
              {s.name}
            </Badge>
          </button>
        ))}
      </div>

      {/* Step heading + description */}
      <Heading level="h2" variant="primary">
        {step.name}
      </Heading>
      {step.description && <Text className="text-foreground-muted">{step.description}</Text>}

      {/* Step content (key remounts on step change for the entrance feel) */}
      <div key={step.id} style={{ marginTop: 26 }}>
        <WizardStep step={step} ruleset={ruleset} />
      </div>

      {/* Fixed translucent footer nav */}
      <footer
        className="flex items-center gap-3"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 25,
          padding: '14px clamp(20px,4vw,32px)',
          background: 'color-mix(in oklab, var(--color-background-secondary) 92%, transparent)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderTop: '1px solid var(--color-border-primary)',
        }}
      >
        <Button variant="ghost" onClick={onCancel ?? (() => router.back())}>
          Cancel
        </Button>
        <div style={{ flex: 1 }} />
        <Button variant="outline" onClick={goBack} disabled={stepIndex === 0}>
          Back
        </Button>
        {isLast ? (
          <Button variant="ember" loading={isLoading} disabled={!canAdvance} onClick={handleFinish}>
            Create character
          </Button>
        ) : (
          <Button variant="default" disabled={!canAdvance} onClick={goNext}>
            Next
          </Button>
        )}
      </footer>
    </div>
  );
}
