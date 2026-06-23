'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import type { Ruleset } from '@heist-mind/database';
import { Badge, Button, Container, Heading, Input, Stack, Text } from '@heist-mind/ui';
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
 * Ruleset-driven character creation wizard. The step list comes from the
 * ruleset (`deriveSteps`); each step renders the real `@heist-mind/ui`
 * components. Submitting persists the character via the repository layer.
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
    <Container maxWidth='3xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Input
          label='Character name'
          placeholder='Name your character'
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />

        {/* Stepper — Badge isn't clickable on its own, so wrap in a button. */}
        <Stack
          direction='row'
          gap='xs'
          className='flex-wrap'
          role='tablist'
          aria-label='Creation steps'
        >
          {steps.map((s, i) => (
            <button
              key={s.id}
              type='button'
              onClick={() => goToStep(i)}
              aria-current={i === stepIndex}
              className='cursor-pointer border-0 bg-transparent p-0'
            >
              <Badge variant={i === stepIndex ? 'ember' : isStepValid(i) ? 'success' : 'outline'}>
                {i + 1}. {s.name}
              </Badge>
            </button>
          ))}
        </Stack>

        <Stack direction='column' gap='sm'>
          <Heading level='h2' variant='primary'>
            {step.name}
          </Heading>
          {step.description && <Text variant='muted'>{step.description}</Text>}
        </Stack>

        <WizardStep step={step} ruleset={ruleset} />

        <Stack direction='row' justify='between' align='center'>
          <Button variant='ghost' onClick={onCancel ?? (() => router.back())}>
            Cancel
          </Button>
          <Stack direction='row' gap='sm'>
            <Button variant='outline' onClick={goBack} disabled={stepIndex === 0}>
              Back
            </Button>
            {isLast ? (
              <Button
                variant='ember'
                loading={isLoading}
                disabled={!canAdvance}
                onClick={handleFinish}
              >
                Create character
              </Button>
            ) : (
              <Button variant='default' disabled={!canAdvance} onClick={goNext}>
                Next
              </Button>
            )}
          </Stack>
        </Stack>
      </Stack>
    </Container>
  );
}
