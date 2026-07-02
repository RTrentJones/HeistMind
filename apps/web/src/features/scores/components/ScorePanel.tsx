'use client';

import { useState } from 'react';
import { Alert, Badge, Button, Input, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useCreateRoll } from '@/features/rolls/data/mutations';
import { useScoresByGame } from '@/features/scores/data/queries';
import { useEndScore, useStartScore } from '@/features/scores/data/mutations';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Score / operation lifecycle (campaign). A game runs as a series of scores — the per-operation unit
 * that per-score loadout hangs off. The GM starts one (at most one active at a time) and ends it;
 * start/end are logged to the campaign (roll) log. Sessions are real-life and not modelled.
 */
export function ScorePanel({ gameId, isGm }: { gameId: string; isGm: boolean }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const scoresQuery = useScoresByGame(gameId);
  const startScoreMut = useStartScore(gameId);
  const endScoreMut = useEndScore(gameId);
  const createRoll = useCreateRoll(gameId);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const scores = scoresQuery.data ?? [];
  // At most one score is active at a time; recent = the last few completed ones.
  const active = scores.find(s => s.status === 'active') ?? null;
  const recent = scores.filter(s => s.status === 'completed').slice(0, 5);
  const busy = startScoreMut.isPending || endScoreMut.isPending || createRoll.isPending;
  const shownError =
    error ??
    scoresQuery.error?.message ??
    (scoresQuery.isError ? t('components.scorePanel.loadFailed') : null);

  // Score start/end is a settled campaign event → log it, tagged with that score explicitly (the
  // end event fires after the score is no longer active, so we can't rely on auto-tagging).
  const logScoreEvent = (label: string, note: string, scoreId: string) => {
    const userId = user?.id;
    if (!userId) return;
    return createRoll.mutateAsync({
      userId,
      data: { gameId, kind: 'score', label, dice: 0, results: [], note, scoreId },
    });
  };

  const startScore = async () => {
    const userId = user?.id;
    if (!userId) return;
    setError(null);
    try {
      const created = await startScoreMut.mutateAsync({
        userId,
        data: { gameId, name: name.trim() || undefined },
      });
      setName('');
      await logScoreEvent(
        created.name ?? t('components.scorePanel.unnamed'),
        t('components.scorePanel.startedNote'),
        created.id
      );
    } catch (e) {
      setError((e as Error).message ?? t('components.scorePanel.startFailed'));
    }
  };

  const endScore = async () => {
    if (!active) return;
    setError(null);
    try {
      await endScoreMut.mutateAsync(active.id);
      await logScoreEvent(
        active.name ?? t('components.scorePanel.unnamed'),
        t('components.scorePanel.endedNote'),
        active.id
      );
    } catch (e) {
      setError((e as Error).message ?? t('components.scorePanel.endFailed'));
    }
  };

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
