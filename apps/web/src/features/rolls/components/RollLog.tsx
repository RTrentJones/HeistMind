'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Roll } from '@heist-mind/database';
import { Badge, Card, Stack, Text } from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';

const OUTCOME_VARIANT = {
  crit: 'gold',
  success: 'success',
  partial: 'warning',
  bad: 'stress-critical',
} as const;

/** Reverse-chron, DB-backed roll log for a campaign — the async play-by-post feed. */
export function RollLog({ gameId, refreshKey }: { gameId: string; refreshKey?: number }) {
  const [rolls, setRolls] = useState<Roll[] | null>(null);

  const load = useCallback(() => {
    getRepositories()
      .rolls.findByGame(gameId, 25)
      .then(r => {
        if (r.success) setRolls(r.data);
      });
  }, [gameId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (rolls === null) return null;
  if (rolls.length === 0) {
    return (
      <Text variant='muted' size='sm'>
        No rolls yet.
      </Text>
    );
  }

  return (
    <Stack direction='column' gap='sm'>
      {rolls.map(r => (
        <Card key={r.id} variant='outline'>
          <Stack direction='row' justify='between' align='center' className='flex-wrap'>
            <div>
              <Text as='strong'>{r.label ?? r.kind}</Text>
              <Text variant='muted' size='sm'>
                {' '}
                · [{r.results.join(', ')}]{r.position ? ` · ${r.position}/${r.effect ?? ''}` : ''}
              </Text>
            </div>
            <Badge variant={OUTCOME_VARIANT[r.outcome]}>{r.outcome}</Badge>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
