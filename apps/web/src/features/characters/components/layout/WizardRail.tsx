'use client';

import { useShallow } from 'zustand/react/shallow';
import { useCharacterCreationStore } from '../../stores/character-creation-store';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Left vertical step rail for the `rail` layout (ported from
 * CharacterCreator.dc.html). Same store-driven steps as the single-column
 * stepper, shown as a tall list with step number / completion check.
 */
export function WizardRail() {
  const { t } = useTranslation();
  const { steps, stepIndex, goToStep, isStepValid } = useCharacterCreationStore(
    useShallow(s => ({
      steps: s.steps,
      stepIndex: s.stepIndex,
      goToStep: s.goToStep,
      isStepValid: s.isStepValid,
    }))
  );

  return (
    <nav className='flex flex-col gap-1' aria-label={t('components.wizard.stepsLabel')}>
      {steps.map((s, i) => {
        const current = i === stepIndex;
        const complete = !current && isStepValid(i);
        return (
          <button
            key={s.id}
            type='button'
            onClick={() => goToStep(i)}
            aria-current={current}
            className='flex cursor-pointer items-center gap-3 text-left'
            style={{
              padding: '11px 12px',
              borderRadius: 11,
              border: current
                ? '1px solid color-mix(in oklab, var(--color-game-ember) 42%, transparent)'
                : '1px solid transparent',
              background: current
                ? 'color-mix(in oklab, var(--color-game-ember) 13%, transparent)'
                : 'transparent',
              color: current
                ? 'var(--color-foreground-primary)'
                : 'var(--color-foreground-secondary)',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 26,
                height: 26,
                flex: 'none',
                borderRadius: 8,
                display: 'grid',
                placeItems: 'center',
                fontSize: 12,
                fontWeight: 700,
                background: complete
                  ? 'color-mix(in oklab, var(--color-semantic-success) 22%, transparent)'
                  : current
                    ? 'var(--color-game-ember)'
                    : 'var(--color-background-elevated)',
                color: complete
                  ? 'var(--color-semantic-success)'
                  : current
                    ? '#0b0b0d'
                    : 'var(--color-foreground-muted)',
                border: complete
                  ? '1px solid color-mix(in oklab, var(--color-semantic-success) 40%, transparent)'
                  : '1px solid transparent',
              }}
            >
              {complete ? '✓' : i + 1}
            </span>
            <span className='flex flex-col' style={{ lineHeight: 1.15 }}>
              <span
                className='text-foreground-muted'
                style={{ fontSize: 10, letterSpacing: '0.12em' }}
              >
                {t('components.wizard.stepNumber', { num: String(i + 1).padStart(2, '0') })}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
