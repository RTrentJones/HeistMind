'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import type { Ruleset } from '@heist-mind/core';
import { Badge, Button, Heading, Input, Text } from '@heist-mind/ui';
import { useCharacterCreationStore } from '../stores/character-creation-store';
import { useTranslation } from '@/lib/i18n/hooks';
import { WizardStep } from './WizardStep';
import { WizardRail } from './layout/WizardRail';
import { WizardSummary } from './layout/WizardSummary';
import { STEP_STATUS_KEY, stepStatus, type StepStatus } from './layout/step-status';

// Pill look per status: brand = here, green = done, amber = visited but invalid, outline = ahead.
const STEP_BADGE: Record<StepStatus, 'default' | 'success' | 'warning' | 'outline'> = {
  current: 'default',
  complete: 'success',
  incomplete: 'warning',
  upcoming: 'outline',
};
const STEP_BADGE_CLASS: Record<StepStatus, string> = {
  // brand-secondary, not the brand-primary fill: white on brand-primary is only 4.2:1.
  current: 'bg-brand-secondary ring-2 ring-brand-primary/40',
  complete: '',
  incomplete: '',
  upcoming: 'text-foreground-muted',
};

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
  // F28 — two-click cancel; the armed label reassures that the draft is saved.
  const [cancelArmed, setCancelArmed] = useState(false);
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
    <div className='w-full max-w-md'>
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
      <Heading level='h2' as='h1' variant='primary'>
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
      className='flex flex-wrap items-center gap-x-3 gap-y-2'
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
      {/* F28 — leaving is safe (the draft persists to localStorage and auto-resumes), and the
          two-click cancel SAYS so instead of silently navigating away. */}
      <Button
        variant='ghost'
        onClick={() => {
          if (!cancelArmed) {
            setCancelArmed(true);
            return;
          }
          (onCancel ?? (() => router.back()))();
        }}
        onBlur={() => setCancelArmed(false)}
      >
        {cancelArmed ? t('components.wizard.cancelConfirm') : t('common.actions.cancel')}
      </Button>
      {/* F99 — below `md` the blocking reason gets its own full-width row above the buttons
          (it was a `truncate` flex child squeezed to "Can't co…" at 360). From `md` up it sits
          inline between Cancel and Back, where it fits. */}
      {!canAdvance && blockingReason && (
        <Text
          size='sm'
          role='status'
          data-testid='wizard-blocking-reason'
          className='order-first basis-full whitespace-normal text-semantic-warning md:order-none md:min-w-0 md:flex-1 md:basis-auto md:truncate'
        >
          {t('components.wizard.cantContinue')} {blockingReason}
        </Text>
      )}
      <div className={!canAdvance && blockingReason ? 'flex-1 md:hidden' : 'flex-1'} />

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

      {/* Stepper (F93) — an ordered list of steps, not a tablist (it held buttons, not tabs: the
          axe aria-required-children violation). Status is in the pill's look AND its accessible
          name; only the step on screen carries aria-current="step". */}
      <nav aria-label={t('components.wizard.stepsLabel')} style={{ marginBottom: 30 }}>
        <ol className='flex flex-wrap gap-2'>
          {steps.map((s, i) => {
            const status = stepStatus(i, stepIndex, stepValidity[i] ?? false);
            return (
              <li key={s.id}>
                <button
                  type='button'
                  onClick={() => goToStep(i)}
                  aria-current={status === 'current' ? 'step' : undefined}
                  className='flex min-h-11 cursor-pointer items-center rounded-3xl border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary'
                >
                  <Badge variant={STEP_BADGE[status]} className={STEP_BADGE_CLASS[status]}>
                    <span aria-hidden='true' className='mr-1 tabular-nums'>
                      {status === 'complete' ? '✓' : status === 'incomplete' ? '!' : i + 1}
                    </span>
                    <span>{s.name}</span>
                    <span className='sr-only'> ({t(STEP_STATUS_KEY[status])})</span>
                  </Badge>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {stepHeading}
      <div style={{ marginTop: 26 }}>{content}</div>
      {footer}
    </div>
  );
}
