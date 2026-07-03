'use client';

import { useMemo } from 'react';
import { resistanceStress, type Roll } from '@heist-mind/core';
import { Badge, Card, Stack, Text, Tooltip } from '@heist-mind/ui';
import { useCharactersByGame } from '@/features/characters/data/queries';
import { useRollsByGame } from '@/features/rolls/data/queries';
import { useScoresByGame } from '@/features/scores/data/queries';
import { useTranslation } from '@/lib/i18n/hooks';

const OUTCOME_VARIANT = {
  crit: 'gold',
  success: 'success',
  partial: 'warning',
  bad: 'stress-critical',
} as const;

// Non-dice campaign events — shown with a neutral kind badge instead of a dice outcome.
const EVENT_KIND_KEY = {
  downtime: 'components.rollLog.downtime',
  loadout: 'components.rollLog.loadout',
  score: 'components.rollLog.score',
  crew: 'components.rollLog.crew',
  faction: 'components.rollLog.faction',
  clock: 'components.rollLog.clock',
  xp: 'components.rollLog.xp',
  note: 'components.rollLog.note',
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
export function RollLog({ gameId }: { gameId: string }) {
  const { t } = useTranslation();
  const rollsQuery = useRollsByGame(gameId, 25);
  const charsQuery = useCharactersByGame(gameId);
  const scoresQuery = useScoresByGame(gameId);

  // Resolve characterId → name (who made each roll) and scoreId → name (group the feed by operation).
  const charNames = useMemo(
    () => Object.fromEntries((charsQuery.data ?? []).map(c => [c.id, c.name])),
    [charsQuery.data]
  );
  const scoreNames = useMemo(
    () => Object.fromEntries((scoresQuery.data ?? []).map(s => [s.id, s.name ?? ''])),
    [scoresQuery.data]
  );

  const rolls = rollsQuery.data ?? null;
  if (rolls === null) return null;
  if (rolls.length === 0) {
    return (
      <Text variant='muted' size='sm'>
        {t('components.rollLog.empty')}
      </Text>
    );
  }

  const now = Date.now();

  const renderRoll = (r: Roll) => {
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
            {/* Free-text note — e.g. a pushed roll, a devil's bargain, or a recorded result. */}
            {r.note ? (
              <Text variant='muted' size='sm' className='block italic'>
                {r.note}
              </Text>
            ) : null}
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
            {r.kind in EVENT_KIND_KEY ? (
              <Badge variant='steel'>
                {t(EVENT_KIND_KEY[r.kind as keyof typeof EVENT_KIND_KEY])}
              </Badge>
            ) : (
              <Badge variant={OUTCOME_VARIANT[r.outcome]}>{r.outcome}</Badge>
            )}
          </Stack>
        </Stack>
      </Card>
    );
  };

  // One score is active at a time, so events cluster by operation — group them (newest score first),
  // each under its name. Skip headers entirely when no scores are in play (flat feed, à la carte).
  const groups: { scoreId: string | null; rolls: Roll[] }[] = [];
  const byKey = new Map<string | null, Roll[]>();
  for (const r of rolls) {
    const key = r.scoreId ?? null;
    let arr = byKey.get(key);
    if (!arr) {
      arr = [];
      byKey.set(key, arr);
      groups.push({ scoreId: key, rolls: arr });
    }
    arr.push(r);
  }
  // groups is non-empty here (we returned early on no rolls); optional-chain to satisfy the checker.
  const showHeaders = groups.length > 1 || groups[0]?.scoreId != null;

  return (
    <Stack direction='column' gap='sm'>
      {showHeaders
        ? groups.map(g => (
            <Stack key={g.scoreId ?? 'none'} direction='column' gap='sm'>
              <Text variant='muted' size='sm' className='font-display'>
                {g.scoreId
                  ? scoreNames[g.scoreId] || t('components.rollLog.unnamedScore')
                  : t('components.rollLog.noScore')}
              </Text>
              {g.rolls.map(renderRoll)}
            </Stack>
          ))
        : rolls.map(renderRoll)}
    </Stack>
  );
}
