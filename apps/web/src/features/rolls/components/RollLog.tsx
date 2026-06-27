'use client';

import { useCallback, useEffect, useState } from 'react';
import { resistanceStress, type Roll } from '@heist-mind/database';
import { Badge, Card, Stack, Text, Tooltip } from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n/hooks';

const OUTCOME_VARIANT = {
  crit: 'gold',
  success: 'success',
  partial: 'warning',
  bad: 'stress-critical',
} as const;

type TFn = ReturnType<typeof useTranslation>['t'];

/** Coarse, locale-friendly relative time ("just now", "5m ago", "3h ago", "2d ago"). */
function relativeTime(date: Date, now: number, t: TFn): string {
  const sec = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (sec < 60) return t('components.rollLog.justNow');
  const min = Math.round(sec / 60);
  if (min < 60) return t('components.rollLog.minutesAgo', { count: min });
  const hr = Math.round(min / 60);
  if (hr < 24) return t('components.rollLog.hoursAgo', { count: hr });
  return t('components.rollLog.daysAgo', { count: Math.round(hr / 24) });
}

/** Reverse-chron, DB-backed roll log for a campaign — the async play-by-post feed. */
export function RollLog({ gameId, refreshKey }: { gameId: string; refreshKey?: number }) {
  const { t } = useTranslation();
  const [rolls, setRolls] = useState<Roll[] | null>(null);
  const [charNames, setCharNames] = useState<Record<string, string>>({});

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

  // Resolve characterId → name so each roll can show who made it (the play-by-post attribution).
  useEffect(() => {
    let active = true;
    getRepositories()
      .characters.findByGame(gameId)
      .then(r => {
        if (active && r.success) {
          setCharNames(Object.fromEntries(r.data.map(c => [c.id, c.name])));
        }
      });
    return () => {
      active = false;
    };
  }, [gameId]);

  if (rolls === null) return null;
  if (rolls.length === 0) {
    return (
      <Text variant='muted' size='sm'>
        {t('components.rollLog.empty')}
      </Text>
    );
  }

  const now = Date.now();

  return (
    <Stack direction='column' gap='sm'>
      {rolls.map(r => {
        const who = r.characterId
          ? (charNames[r.characterId] ?? t('components.rollLog.unknownPlayer'))
          : r.kind === 'fortune'
            ? t('components.rollLog.fortune')
            : t('components.rollLog.gm');
        // Only join position/effect with a slash when both are present (no trailing "position/").
        const posEffect =
          r.position && r.effect ? `${r.position}/${r.effect}` : (r.position ?? r.effect ?? '');
        const resisted =
          r.kind === 'resistance'
            ? t('components.rollLog.resisted', { count: resistanceStress(r.results) })
            : null;
        const created = new Date(r.createdAt);
        return (
          <Card key={r.id} variant='outline'>
            <Stack direction='row' justify='between' align='center' className='flex-wrap'>
              <div>
                <Text as='strong'>{r.label ?? r.kind}</Text>
                <Text variant='muted' size='sm'>
                  {' '}
                  · {who}
                  {r.results.length > 0 ? ` · [${r.results.join(', ')}]` : ''}
                  {posEffect ? ` · ${posEffect}` : ''}
                  {resisted ? ` · ${resisted}` : ''}
                </Text>
              </div>
              <Stack direction='row' gap='sm' align='center'>
                <Tooltip content={created.toLocaleString()}>
                  <time
                    dateTime={created.toISOString()}
                    className='cursor-default text-sm text-foreground-muted'
                  >
                    {relativeTime(created, now, t)}
                  </time>
                </Tooltip>
                {r.kind === 'downtime' ? (
                  <Badge variant='steel'>{t('components.rollLog.downtime')}</Badge>
                ) : (
                  <Badge variant={OUTCOME_VARIANT[r.outcome]}>{r.outcome}</Badge>
                )}
              </Stack>
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
