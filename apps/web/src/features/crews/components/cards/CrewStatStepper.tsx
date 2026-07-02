'use client';

import { Badge, Button, Stack, Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * One crew stat as a labelled −/badge/+ stepper. GM-only controls (RLS enforces server-side; the
 * gate keeps the UI honest — players see the value, not dead buttons). `onIncrement` lets a stat
 * override the plain +1 (e.g. heat's fill-→-wanted cascade).
 */
export function CrewStatStepper({
  label,
  value,
  testId,
  max,
  isGm,
  busy,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: number;
  testId: string;
  max?: number;
  isGm: boolean;
  busy: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Stack direction='column' gap='xs' align='center'>
      <Text size='sm' className='font-display'>
        {label}
      </Text>
      <Stack direction='row' gap='xs' align='center'>
        {isGm && (
          <Button
            variant='outline'
            size='sm'
            aria-label={t('components.crewSheet.decreaseAria', { label })}
            disabled={busy || value <= 0}
            onClick={onDecrement}
          >
            −
          </Button>
        )}
        <Badge variant='steel'>
          <span data-testid={testId}>{value}</span>
        </Badge>
        {isGm && (
          <Button
            variant='outline'
            size='sm'
            aria-label={t('components.crewSheet.increaseAria', { label })}
            disabled={busy || (max != null && value >= max)}
            onClick={onIncrement}
          >
            +
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
