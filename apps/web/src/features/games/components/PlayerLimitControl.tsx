'use client';

import { useState } from 'react';
import {
  MAX_PLAYER_LIMIT,
  MIN_PLAYER_LIMIT,
  campaignCapacity,
  playerLimitRefusal,
  type Game,
} from '@heist-mind/core';
import { Button, Input, Stack, Text } from '@heist-mind/ui';
import { useSetPlayerLimit } from '@/features/games/data/mutations';
import { useComponentTranslation } from '@/lib/i18n/hooks';
import { errorMessage } from '@/lib/query/result';
import { useNotificationStore } from '@/shared/stores/notification-store';

/**
 * The campaign's seat count, and (GM) the lever to change it (round 4 P1-N1). Everyone sees
 * "N of M players"; the GM sets the limit — 1…30 players, never below the players already in
 * (the GM's own seat isn't counted). The DB enforces the same bounds (00026).
 */
export function PlayerLimitControl({
  game,
  isGm,
}: {
  game: Pick<Game, 'id' | 'currentPlayers' | 'maxPlayers'>;
  isGm: boolean;
}) {
  const { t } = useComponentTranslation();
  const setLimit = useSetPlayerLimit(game.id);
  const capacity = campaignCapacity(game);
  const [draft, setDraft] = useState(String(capacity.limit));
  const [error, setError] = useState<string | null>(null);

  const summary = capacity.full
    ? t('members.seatsFull', { players: capacity.players, limit: capacity.limit })
    : t('members.seats', { players: capacity.players, limit: capacity.limit });

  if (!isGm) {
    return (
      <Text variant='muted' size='sm' data-testid='player-seats'>
        {summary}
      </Text>
    );
  }

  const value = Number(draft);
  const refusal =
    draft.trim() === '' ? 'NOT_A_NUMBER' : playerLimitRefusal(value, capacity.players);
  const changed = value !== capacity.limit;

  const save = () => {
    setError(null);
    if (refusal) return;
    setLimit.mutate(
      { players: value },
      {
        onSuccess: () =>
          useNotificationStore.getState().success(t('members.limitSaved', { limit: value })),
        onError: err => {
          const msg = errorMessage(err);
          setError(
            /below the players/i.test(msg)
              ? t('members.limitBelowPlayers', { players: capacity.players })
              : t('members.limitFailed')
          );
        },
      }
    );
  };

  const hint =
    refusal === 'BELOW_PLAYERS'
      ? t('members.limitBelowPlayers', { players: capacity.players })
      : refusal
        ? t('members.limitRange', { min: MIN_PLAYER_LIMIT, max: MAX_PLAYER_LIMIT })
        : null;

  return (
    <Stack direction='column' gap='xs'>
      <Text variant='muted' size='sm' data-testid='player-seats'>
        {summary}
      </Text>
      <form
        className='flex flex-wrap items-end gap-2'
        onSubmit={e => {
          e.preventDefault();
          save();
        }}
      >
        <label className='flex flex-col gap-1 text-sm'>
          {t('members.limitLabel')}
          <Input
            type='number'
            inputMode='numeric'
            size='sm'
            className='w-24'
            min={Math.max(MIN_PLAYER_LIMIT, capacity.players)}
            max={MAX_PLAYER_LIMIT}
            step={1}
            value={draft}
            aria-describedby={`${game.id}-limit-help`}
            onChange={e => {
              setDraft(e.target.value);
              setError(null);
            }}
          />
        </label>
        <Button
          type='submit'
          variant='outline'
          size='sm'
          disabled={!!refusal || !changed}
          loading={setLimit.isPending}
        >
          {t('members.limitSave')}
        </Button>
      </form>
      <Text
        id={`${game.id}-limit-help`}
        variant='muted'
        size='sm'
        role={error || hint ? 'alert' : undefined}
        className={error || hint ? 'text-semantic-error' : undefined}
      >
        {error ?? hint ?? t('members.limitHelp', { max: MAX_PLAYER_LIMIT })}
      </Text>
    </Stack>
  );
}
