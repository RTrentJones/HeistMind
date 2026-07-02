'use client';

import { type Clock as ClockType } from '@heist-mind/database';
import { Alert, Badge, Card, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useClocksByGame } from '@/features/clocks/data/queries';
import { useCreateClock, useDeleteClock, useUpdateClock } from '@/features/clocks/data/mutations';
import { useTranslation } from '@/lib/i18n/hooks';
import { ClockTile } from './ClockTile';
import { NewClockForm } from './NewClockForm';

/**
 * Progress clocks for a campaign. Everyone sees the clocks (DB-backed shared state, loaded on
 * view — the async loop). Only the GM gets the create / tick / remove controls; RLS enforces the
 * same restriction server-side, so the controls are a convenience, not the gate.
 */
export function ClocksPanel({ gameId, isGm }: { gameId: string; isGm: boolean }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const clocksQuery = useClocksByGame(gameId);
  const createClock = useCreateClock(gameId);
  const updateClock = useUpdateClock(gameId);
  const deleteClock = useDeleteClock(gameId);

  // Faction project clocks live in the Factions panel; this panel shows the standalone ones.
  const clocks = (clocksQuery.data ?? []).filter(c => !c.linkedType);
  const busy = createClock.isPending || updateClock.isPending || deleteClock.isPending;
  const error =
    clocksQuery.error?.message ??
    createClock.error?.message ??
    updateClock.error?.message ??
    deleteClock.error?.message ??
    null;

  const tick = (clock: ClockType, delta: number) =>
    updateClock.mutate({ id: clock.id, patch: { filled: clock.filled + delta } });

  return (
    <Stack direction='column' gap='md'>
      {error && (
        <Alert variant='destructive' size='sm'>
          {error}
        </Alert>
      )}

      {clocks.length === 0 ? (
        <Text variant='muted' size='sm'>
          {t('components.clocksPanel.empty')}
          {isGm ? t('components.clocksPanel.emptyGmHint') : ''}
        </Text>
      ) : (
        <Stack direction='row' gap='lg' className='flex-wrap'>
          {clocks.map(c => {
            const complete = c.filled >= c.segments;
            return (
              <Card
                key={c.id}
                variant='outline'
                className={
                  complete ? 'ring-1 ring-game-ember/60 shadow-lg shadow-game-ember/20' : undefined
                }
              >
                <Stack direction='column' gap='sm' align='center'>
                  <ClockTile
                    clock={c}
                    isGm={isGm}
                    busy={busy}
                    size={84}
                    removeLabel={t('components.clocksPanel.remove')}
                    onTick={tick}
                    onRemove={id => deleteClock.mutate(id)}
                  />
                  {complete && (
                    <Badge variant='success'>{t('components.clocksPanel.complete')}</Badge>
                  )}
                </Stack>
              </Card>
            );
          })}
        </Stack>
      )}

      {isGm && (
        <NewClockForm
          label={t('components.clocksPanel.newClockLabel')}
          placeholder={t('components.clocksPanel.newClockPlaceholder')}
          cta={t('components.clocksPanel.addClock')}
          busy={busy}
          onCreate={(name, segments) => {
            const userId = user?.id;
            if (!userId) return;
            createClock.mutate({ userId, data: { gameId, name, segments } });
          }}
        />
      )}
    </Stack>
  );
}
