'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import type { Ruleset } from '@heist-mind/database';
import { Badge, Button, Heading, Input, Text } from '@heist-mind/ui';
import { useCharacterCreationStore } from '../stores/character-creation-store';
import { useTranslation } from '@/lib/i18n/hooks';
import { WizardStep } from './WizardStep';
import { WizardRail } from './layout/WizardRail';
import { WizardSummary } from './layout/WizardSummary';

interface CharacterCreationWizardProps {
  ruleset: Ruleset;
  /** The campaign to create inside; omit for a standalone character (Phase 5). When omitted, pass
   * `onComplete` to route to the standalone sheet. */
  gameId?: string;
  /**
   * `single` (default) — centered single column with a Badge stepper.
   * `rail` — 3-column: left step rail, center stage, right live summary.
   * Both are ported from the Claude Design templates (see `../design/`).
   */
  layout?: 'single' | 'rail';
  /** Called with the new character id after a successful create. */
  onComplete?: (characterId: string) => void;
  onCancel?: () => void;
}

/** Ruleset-driven character creation wizard. */
export function CharacterCreationWizard({
  ruleset,
  gameId,
  layout = 'single',
  onComplete,
  onCancel,
}: CharacterCreationWizardProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { steps, stepIndex, name, isLoading, init, setName, goNext, goBack, goToStep, submit } =
    useCharacterCreationStore(
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
        submit: s.submit,
      }))
    );

  // Validity depends on `draft` (and `name`), which the selector above intentionally omits
  // (the draft is large and changes constantly). Subscribe to the computed per-step validity
  // as a primitive boolean array so the Next button and the stepper re-render the instant a
  // selection makes the current step valid — without this the footer's disabled state goes
  // stale and the wizard deadlocks (Next never enables after picking a playbook).
  const stepValidity = useCharacterCreationStore(
    useShallow(s => s.steps.map((_, i) => s.isStepValid(i)))
  );
  // The blocking reason for the current step, so a disabled Next/Create can say *why*.
  const blockingReason = useCharacterCreationStore(s => s.stepError(stepIndex));

  useEffect(() => {
    init(ruleset, gameId);
  }, [ruleset, gameId, init]);

  const step = steps[stepIndex];
  if (!step) return null;

  const isLast = stepIndex === steps.length - 1;
  const canAdvance = stepValidity[stepIndex] ?? false;

  const handleFinish = async () => {
    const id = await submit();
    if (id) {
      if (onComplete) onComplete(id);
      else if (gameId) router.push(`/games/${gameId}`);
      else router.push(`/characters/${id}`);
    }
  };

  const nameField = (
    <div style={{ maxWidth: 460 }}>
      <Input
        label={t('components.wizard.nameLabel')}
        required
        placeholder={t('components.wizard.namePlaceholder')}
        value={name}
        onChange={e => setName(e.target.value)}
        helpText={t('components.wizard.nameHelp')}
      />
    </div>
  );

  const stepHeading = (
    <div>
      <Heading level='h2' variant='primary'>
        {step.name}
      </Heading>
      {step.description && <Text className='text-foreground-muted'>{step.description}</Text>}
    </div>
  );

  const content = (
    <div key={step.id}>
      <WizardStep step={step} ruleset={ruleset} />
    </div>
  );

  const footer = (
    <footer
      className='flex items-center gap-3'
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
      <Button variant='ghost' onClick={onCancel ?? (() => router.back())}>
        {t('common.actions.cancel')}
      </Button>
      {!canAdvance && blockingReason ? (
        <Text size='sm' role='status' className='min-w-0 flex-1 truncate text-semantic-warning'>
          {t('components.wizard.cantContinue')} {blockingReason}
        </Text>
      ) : (
        <div style={{ flex: 1 }} />
      )}
      <Button variant='outline' onClick={goBack} disabled={stepIndex === 0}>
        {t('common.actions.back')}
      </Button>
      {isLast ? (
        <Button variant='ember' loading={isLoading} disabled={!canAdvance} onClick={handleFinish}>
          {t('components.wizard.createCharacter')}
        </Button>
      ) : (
        <Button variant='default' disabled={!canAdvance} onClick={goNext}>
          {t('common.actions.next')}
        </Button>
      )}
    </footer>
  );

  if (layout === 'rail') {
    return (
      <>
        <div
          className='mx-auto grid grid-cols-1 gap-6 md:grid-cols-[228px_minmax(0,1fr)] min-[1180px]:grid-cols-[272px_minmax(0,1fr)_340px]'
          style={{ maxWidth: 1280, padding: '36px clamp(20px,4vw,32px) 130px' }}
        >
          <div className='hidden md:block'>
            <WizardRail />
          </div>
          <div className='flex flex-col gap-[26px]'>
            {nameField}
            {stepHeading}
            {content}
          </div>
          <div className='hidden min-[1180px]:block'>
            <WizardSummary />
          </div>
        </div>
        {footer}
      </>
    );
  }

  return (
    <div className='mx-auto' style={{ maxWidth: 900, padding: '36px clamp(20px,4vw,32px) 130px' }}>
      <div style={{ marginBottom: 26 }}>{nameField}</div>

      {/* Stepper — Badge isn't clickable on its own, so wrap in a button */}
      <div
        className='flex flex-wrap gap-2'
        style={{ marginBottom: 30 }}
        role='tablist'
        aria-label={t('components.wizard.stepsLabel')}
      >
        {steps.map((s, i) => (
          <button
            key={s.id}
            type='button'
            onClick={() => goToStep(i)}
            aria-current={i === stepIndex}
            className='cursor-pointer border-0 bg-transparent p-0'
          >
            <Badge variant={i === stepIndex ? 'ember' : stepValidity[i] ? 'success' : 'outline'}>
              {s.name}
            </Badge>
          </button>
        ))}
      </div>

      {stepHeading}
      <div style={{ marginTop: 26 }}>{content}</div>
      {footer}
    </div>
  );
}
