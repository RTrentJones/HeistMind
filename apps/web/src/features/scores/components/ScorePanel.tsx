'use client';

import { useEffect, useState } from 'react';
import type { Score } from '@heist-mind/database';
import { Alert, Badge, Button, Input, Stack, Text } from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Score / operation lifecycle (campaign). A game runs as a series of scores — the per-operation unit
 * that per-score loadout hangs off. The GM starts one (at most one active at a time) and ends it;
 * start/end are logged to the campaign (roll) log. Sessions are real-life and not modelled.
 */
export function ScorePanel({
  gameId,
  isGm,
  onChanged,
}: {
  gameId: string;
  isGm: boolean;
  onChanged?: () => void;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [active, setActive] = useState<Score | null>(null);
  const [recent, setRecent] = useState<Score[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const r = await getRepositories().scores.findByGame(gameId);
    if (r.success) {
      setActive(r.data.find(s => s.status === 'active') ?? null);
      setRecent(r.data.filter(s => s.status === 'completed').slice(0, 5));
    } else {
      setError(r.error?.message ?? t('components.scorePanel.loadFailed'));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // Score start/end is a settled campaign event → log it, tagged with that score explicitly (the
  // end event fires after the score is no longer active, so we can't rely on auto-tagging).
  const logScoreEvent = async (label: string, note: string, scoreId: string) => {
    const userId = user?.id;
    if (!userId) return;
    await getRepositories().rolls.create(userId, {
      gameId,
      kind: 'score',
      label,
      dice: 0,
      results: [],
      note,
      scoreId,
    });
  };

  const startScore = async () => {
    const userId = user?.id;
    if (!userId) return;
    setBusy(true);
    setError(null);
    const r = await getRepositories().scores.start(userId, {
      gameId,
      name: name.trim() || undefined,
    });
    setBusy(false);
    if (!r.success) {
      setError(r.error?.message ?? t('components.scorePanel.startFailed'));
      return;
    }
    setName('');
    await logScoreEvent(
      r.data.name ?? t('components.scorePanel.unnamed'),
      t('components.scorePanel.startedNote'),
      r.data.id
    );
    await load();
    onChanged?.();
  };

  const endScore = async () => {
    if (!active) return;
    setBusy(true);
    setError(null);
    const r = await getRepositories().scores.end(active.id);
    setBusy(false);
    if (!r.success) {
      setError(r.error?.message ?? t('components.scorePanel.endFailed'));
      return;
    }
    await logScoreEvent(
      active.name ?? t('components.scorePanel.unnamed'),
      t('components.scorePanel.endedNote'),
      active.id
    );
    await load();
    onChanged?.();
  };

  return (
    <Stack direction='column' gap='sm'>
      {error && (
        <Alert variant='destructive' size='sm'>
          {error}
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
