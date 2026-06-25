'use client';

import { useEffect, useState } from 'react';
import { CLOCK_SEGMENTS, type Clock as ClockType, type ClockSegments } from '@heist-mind/database';
import { Alert, Button, Card, Clock, Input, Stack, Text } from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';

/**
 * Progress clocks for a campaign. Everyone sees the clocks (DB-backed shared state, loaded on
 * view — the async loop). Only the GM gets the create / tick / remove controls; RLS enforces the
 * same restriction server-side, so the controls are a convenience, not the gate.
 */
export function ClocksPanel({ gameId, isGm }: { gameId: string; isGm: boolean }) {
  const { user } = useAuth();
  const [clocks, setClocks] = useState<ClockType[]>([]);
  const [name, setName] = useState('');
  const [segments, setSegments] = useState<ClockSegments>(4);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const r = await getRepositories().clocks.findByGame(gameId);
    // Faction project clocks live in the Factions panel; this panel shows the standalone ones.
    if (r.success) setClocks(r.data.filter(c => !c.linkedType));
    else setError(r.error?.message ?? 'Failed to load clocks');
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const create = async () => {
    const userId = user?.id;
    if (!userId || !name.trim()) return;
    setBusy(true);
    const r = await getRepositories().clocks.create(userId, {
      gameId,
      name: name.trim(),
      segments,
    });
    setBusy(false);
    if (r.success) {
      setName('');
      setSegments(4);
      setError(null);
      await load();
    } else setError(r.error?.message ?? 'Failed to create clock');
  };

  const tick = async (clock: ClockType, delta: number) => {
    setBusy(true);
    const r = await getRepositories().clocks.update(clock.id, { filled: clock.filled + delta });
    setBusy(false);
    if (r.success) await load();
    else setError(r.error?.message ?? 'Failed to update clock');
  };

  const remove = async (id: string) => {
    setBusy(true);
    const r = await getRepositories().clocks.delete(id);
    setBusy(false);
    if (r.success) await load();
    else setError(r.error?.message ?? 'Failed to remove clock');
  };

  return (
    <Stack direction='column' gap='md'>
      {error && (
        <Alert variant='destructive' size='sm'>
          {error}
        </Alert>
      )}

      {clocks.length === 0 ? (
        <Text variant='muted' size='sm'>
          No clocks yet.{isGm ? ' Add one below to track a developing situation.' : ''}
        </Text>
      ) : (
        <Stack direction='row' gap='lg' className='flex-wrap'>
          {clocks.map(c => (
            <Card key={c.id} variant='outline'>
              <Stack direction='column' gap='sm' align='center'>
                <Clock segments={c.segments} filled={c.filled} label={c.name} size={84} />
                {isGm && (
                  <Stack direction='row' gap='xs' align='center'>
                    <Button
                      variant='outline'
                      size='sm'
                      aria-label={`Reduce ${c.name}`}
                      disabled={busy || c.filled <= 0}
                      onClick={() => tick(c, -1)}
                    >
                      −1
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      aria-label={`Advance ${c.name}`}
                      disabled={busy || c.filled >= c.segments}
                      onClick={() => tick(c, 1)}
                    >
                      +1
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      aria-label={`Remove ${c.name}`}
                      disabled={busy}
                      onClick={() => remove(c.id)}
                    >
                      Remove
                    </Button>
                  </Stack>
                )}
              </Stack>
            </Card>
          ))}
        </Stack>
      )}

      {isGm && (
        <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
          <Input
            label='New clock'
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder='e.g. The Alarm'
          />
          <label className='flex flex-col gap-1 text-sm'>
            Segments
            <select
              className='rounded-md border border-border-primary bg-background-secondary px-2 py-1.5 text-sm'
              value={segments}
              onChange={e => setSegments(Number(e.target.value) as ClockSegments)}
            >
              {CLOCK_SEGMENTS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <Button variant='ember' disabled={busy || !name.trim()} onClick={create}>
            Add clock
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
