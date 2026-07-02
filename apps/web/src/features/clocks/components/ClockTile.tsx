'use client';

import type { Clock as ClockType } from '@heist-mind/core';
import { Button, Clock, Stack } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * One clock with its GM tick/remove controls — the single implementation of the −1/+1/remove row
 * (FactionsPanel used to re-implement it for faction project clocks). Layout around the tile
 * (card, complete badge, sizing) stays with the caller.
 */
export function ClockTile({
  clock,
  isGm,
  busy,
  size,
  removeLabel,
  onTick,
  onRemove,
}: {
  clock: ClockType;
  isGm: boolean;
  busy: boolean;
  size: number;
  removeLabel: string;
  onTick: (clock: ClockType, delta: number) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Stack direction='column' gap='xs' align='center'>
      <Clock segments={clock.segments} filled={clock.filled} label={clock.name} size={size} />
      {isGm && (
        <Stack direction='row' gap='xs' align='center'>
          <Button
            variant='outline'
            size='sm'
            aria-label={t('components.clocksPanel.reduceAria', { name: clock.name })}
            disabled={busy || clock.filled <= 0}
            onClick={() => onTick(clock, -1)}
          >
            −1
          </Button>
          <Button
            variant='outline'
            size='sm'
            aria-label={t('components.clocksPanel.advanceAria', { name: clock.name })}
            disabled={busy || clock.filled >= clock.segments}
            onClick={() => onTick(clock, 1)}
          >
            +1
          </Button>
          <Button
            variant='ghost'
            size='sm'
            aria-label={t('components.clocksPanel.removeAria', { name: clock.name })}
            disabled={busy}
            onClick={() => onRemove(clock.id)}
          >
            {removeLabel}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
