'use client';

import { useState } from 'react';
import { Alert, Badge, Button, Input, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useScoresByGame } from '@/features/scores/data/queries';
import { useEndScore, useStartScore } from '@/features/scores/data/mutations';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Score / operation lifecycle (campaign). A game runs as a series of scores — the per-operation unit
 * that per-score loadout hangs off. The GM starts one (at most one active at a time) and ends it;
 * start/end are logged to the campaign (roll) log. Sessions are real-life and not modelled.
 */
const RECENT_SCORES_SHOWN = 5;

export function ScorePanel({ gameId, isGm }: { gameId: string; isGm: boolean }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const scoresQuery = useScoresByGame(gameId);
  const startScoreMut = useStartScore(gameId);
  const endScoreMut = useEndScore(gameId);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const scores = scoresQuery.data ?? [];
  // At most one score is active at a time; recent = the last few completed ones.
  const active = scores.find(s => s.status === 'active') ?? null;
  const recent = scores.filter(s => s.status === 'completed').slice(0, RECENT_SCORES_SHOWN);
  const busy = startScoreMut.isPending || endScoreMut.isPending;
  // F60 — friendly lead, raw repository message as detail.
  const shownError =
    error ??
    (scoresQuery.isError
      ? `${t('components.scorePanel.loadFailed')}${
          scoresQuery.error?.message ? ` — ${scoresQuery.error.message}` : ''
        }`
      : null);

  // Start/end are ENGINE use-cases: the score lifecycle and its campaign-log event happen in one
  // sequenced operation — the panel just supplies the localized copy for the feed entry.
  const startScore = async () => {
    const userId = user?.id;
    if (!userId) return;
    setError(null);
    try {
      const trimmed = name.trim();
      await startScoreMut.mutateAsync({
        userId,
        ...(trimmed ? { name: trimmed } : {}),
        logLabel: trimmed || t('components.scorePanel.unnamed'),
        logNote: t('components.scorePanel.startedNote'),
      });
      setName('');
    } catch (e) {
      setError(
        `${t('components.scorePanel.startFailed')}${
          (e as Error).message ? ` — ${(e as Error).message}` : ''
        }`
      );
    }
  };

  const endScore = async () => {
    const userId = user?.id;
    if (!active || !userId) return;
    setError(null);
    try {
      await endScoreMut.mutateAsync({
        userId,
        scoreId: active.id,
        logLabel: active.name ?? t('components.scorePanel.unnamed'),
        logNote: t('components.scorePanel.endedNote'),
      });
    } catch (e) {
      setError(
        `${t('components.scorePanel.endFailed')}${
          (e as Error).message ? ` — ${(e as Error).message}` : ''
        }`
      );
    }
  };

  // F74 — guard the initial load so the "no active score" state doesn't flash before the first
  // fetch resolves.
  if (scoresQuery.isLoading) {
    return (
      <Text variant='muted' size='sm'>
        {t('components.scorePanel.loading')}
      </Text>
    );
  }

  return (
    <Stack direction='column' gap='sm'>
      {shownError && (
        <Alert variant='destructive' size='sm'>
          {shownError}
        </Alert>
      )}

      {active ? (
        <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
          <Badge variant='ember'>{t('components.scorePanel.inProgress')}</Badge>
          <Text as='strong'>{active.name ?? t('components.scorePanel.unnamed')}</Text>
          {isGm && (
            <Button variant='outline' size='sm' disabled={busy} onClick={() => void endScore()}>
              {t('components.scorePanel.endScore')}
            </Button>
          )}
        </Stack>
      ) : (
        <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
          <Text variant='muted' size='sm'>
            {t('components.scorePanel.none')}
          </Text>
          {isGm && (
            <>
              <Input
                label={t('components.scorePanel.nameLabel')}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('components.scorePanel.namePlaceholder')}
              />
              <Button variant='ember' size='sm' disabled={busy} onClick={() => void startScore()}>
                {t('components.scorePanel.startScore')}
              </Button>
            </>
          )}
        </Stack>
      )}

      {recent.length > 0 && (
        <Stack direction='column' gap='xs'>
          <Text variant='muted' size='sm'>
            {t('components.scorePanel.recent')}
          </Text>
          {recent.map(s => (
            <Text key={s.id} size='sm'>
              {s.name ?? t('components.scorePanel.unnamed')}
              {s.endedAt ? ` · ${s.endedAt.toLocaleDateString()}` : ''}
            </Text>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
