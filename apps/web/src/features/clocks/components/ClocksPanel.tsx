'use client';

import { useState } from 'react';
import { CLOCK_SEGMENTS, type Clock as ClockType, type ClockSegments } from '@heist-mind/database';
import { Alert, Badge, Button, Card, Clock, Input, Select, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useClocksByGame } from '@/features/clocks/data/queries';
import {
  useCreateClock,
  useDeleteClock,
  useUpdateClock,
} from '@/features/clocks/data/mutations';
import { useTranslation } from '@/lib/i18n/hooks';

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
  const [name, setName] = useState('');
  const [segments, setSegments] = useState<ClockSegments>(4);

  // Faction project clocks live in the Factions panel; this panel shows the standalone ones.
  const clocks = (clocksQuery.data ?? []).filter(c => !c.linkedType);
  const busy = createClock.isPending || updateClock.isPending || deleteClock.isPending;
  const error =
    (clocksQuery.error as Error | null)?.message ??
    (createClock.error as Error | null)?.message ??
    (updateClock.error as Error | null)?.message ??
    (deleteClock.error as Error | null)?.message ??
    null;

  const create = () => {
    const userId = user?.id;
    if (!userId || !name.trim()) return;
    createClock.mutate(
      { userId, data: { gameId, name: name.trim(), segments } },
      {
        onSuccess: () => {
          setName('');
          setSegments(4);
        },
      }
    );
  };

  const tick = (clock: ClockType, delta: number) =>
    updateClock.mutate({ id: clock.id, patch: { filled: clock.filled + delta } });

  const remove = (id: string) => deleteClock.mutate(id);

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
                  <Clock segments={c.segments} filled={c.filled} label={c.name} size={84} />
                  {complete && (
                    <Badge variant='success'>{t('components.clocksPanel.complete')}</Badge>
                  )}
                  {isGm && (
                    <Stack direction='row' gap='xs' align='center'>
                      <Button
                        variant='outline'
                        size='sm'
                        aria-label={t('components.clocksPanel.reduceAria', { name: c.name })}
                        disabled={busy || c.filled <= 0}
                        onClick={() => tick(c, -1)}
                      >
                        −1
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        aria-label={t('components.clocksPanel.advanceAria', { name: c.name })}
                        disabled={busy || c.filled >= c.segments}
                        onClick={() => tick(c, 1)}
                      >
                        +1
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        aria-label={t('components.clocksPanel.removeAria', { name: c.name })}
                        disabled={busy}
                        onClick={() => remove(c.id)}
                      >
                        {t('components.clocksPanel.remove')}
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </Card>
            );
          })}
        </Stack>
      )}

      {isGm && (
        <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
          <Input
            label={t('components.clocksPanel.newClockLabel')}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('components.clocksPanel.newClockPlaceholder')}
          />
          <Select
            label={t('components.clocksPanel.segments')}
            value={segments}
            onChange={e => setSegments(Number(e.target.value) as ClockSegments)}
          >
            {CLOCK_SEGMENTS.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Button variant='ember' disabled={busy || !name.trim()} onClick={create}>
            {t('components.clocksPanel.addClock')}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
