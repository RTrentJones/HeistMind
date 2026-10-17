'use client';

import { useRouter } from 'next/navigation';
import type { GameWithDetails } from '@heist-mind/core';
import { Badge, Card, Heading, Stack, Text } from '@heist-mind/ui';
import { useLeaveGame, useRemovePlayer } from '@/features/games/data/mutations';
import { useComponentTranslation } from '@/lib/i18n/hooks';
import { errorMessage } from '@/lib/query/result';
import { ConfirmButton } from '@/shared/components/ConfirmButton';
import { useNotificationStore } from '@/shared/stores/notification-store';

/**
 * Who's in the campaign (F94). Everyone sees the active members; the GM can REMOVE a player
 * (status 'removed' — they can't rejoin with a code, and their characters go back to them as
 * standalone), and a player can LEAVE (same character hand-back). Both are two-click confirms and
 * log a note to the campaign log. The GM sees removed members in a de-emphasised line.
 */
export function MembersPanel({
  game,
  userId,
}: {
  game: Pick<GameWithDetails, 'id' | 'createdBy' | 'players' | 'creator'>;
  userId: string | undefined;
}) {
  const { t } = useComponentTranslation();
  const router = useRouter();
  const removeMut = useRemovePlayer(game.id);
  const leaveMut = useLeaveGame(game.id);
  const isGm = userId != null && userId === game.createdBy;

  const nameOf = (p: GameWithDetails['players'][number]) =>
    p.profile.displayName || p.profile.username || t('roster.unknownPlayer');

  const active = game.players
    .filter(p => p.status === 'active')
    // The GM leads, then players in join order.
    .sort((a, b) => Number(b.playerId === game.createdBy) - Number(a.playerId === game.createdBy));
  const removed = game.players.filter(p => p.status === 'removed');
  const isMember = active.some(p => p.playerId === userId);

  const remove = (p: GameWithDetails['players'][number]) => {
    const name = nameOf(p);
    removeMut.mutate(
      { playerId: p.playerId, note: t('members.removedNote') },
      {
        onSuccess: () =>
          useNotificationStore.getState().success(t('members.removedToast', { name })),
        onError: err =>
          useNotificationStore
            .getState()
            .error(t('members.removeFailed', { name }), errorMessage(err) || undefined),
      }
    );
  };

  const leave = () => {
    leaveMut.mutate(
      { note: t('members.leftNote') },
      {
        onSuccess: () => {
          useNotificationStore.getState().success(t('members.leftToast'));
          router.push('/games');
        },
        onError: err =>
          useNotificationStore
            .getState()
            .error(t('members.leaveFailed'), errorMessage(err) || undefined),
      }
    );
  };

  return (
    <Card variant='outline'>
      <Stack direction='column' gap='sm'>
        <Heading level='h3' as='h2'>
          {t('members.title')}
        </Heading>
        <ul className='flex flex-col gap-2' aria-label={t('members.listLabel')}>
          {active.map(p => {
            const name = nameOf(p);
            const pIsGm = p.playerId === game.createdBy;
            return (
              <li key={p.id} data-testid='member-row'>
                <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
                  <Text as='span'>{name}</Text>
                  <Badge variant='outline'>{pIsGm ? t('members.gm') : t('members.player')}</Badge>
                  {p.playerId === userId && (
                    <Text as='span' variant='muted' size='sm'>
                      {t('members.you')}
                    </Text>
                  )}
                  {isGm && !pIsGm && (
                    <ConfirmButton
                      size='sm'
                      variant='ghost'
                      className='ml-auto'
                      confirmLabel={t('members.confirmRemove', { name })}
                      loading={removeMut.isPending && removeMut.variables?.playerId === p.playerId}
                      aria-label={t('members.removeAria', { name })}
                      onConfirm={() => remove(p)}
                    >
                      {t('members.remove')}
                    </ConfirmButton>
                  )}
                </Stack>
              </li>
            );
          })}
        </ul>
        {isGm && removed.length > 0 && (
          <Text variant='muted' size='sm' data-testid='removed-members'>
            {t('members.removedList', { names: removed.map(nameOf).join(', ') })}
          </Text>
        )}
        {isGm ? (
          <Text variant='muted' size='sm'>
            {t('members.gmHint')}
          </Text>
        ) : (
          isMember && (
            <Stack direction='column' gap='xs' align='start'>
              <Text variant='muted' size='sm'>
                {t('members.leaveHint')}
              </Text>
              <ConfirmButton
                size='sm'
                confirmLabel={t('members.confirmLeave')}
                loading={leaveMut.isPending}
                onConfirm={leave}
              >
                {t('members.leave')}
              </ConfirmButton>
            </Stack>
          )
        )}
      </Stack>
    </Card>
  );
}
