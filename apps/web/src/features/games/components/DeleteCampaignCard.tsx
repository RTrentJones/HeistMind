'use client';

import { useRouter } from 'next/navigation';
import { Card, Heading, Stack, Text } from '@heist-mind/ui';
import { useDeleteGame } from '@/features/games/data/mutations';
import { useComponentTranslation } from '@/lib/i18n/hooks';
import { errorMessage } from '@/lib/query/result';
import { ConfirmButton } from '@/shared/components/ConfirmButton';
import { useNotificationStore } from '@/shared/stores/notification-store';

/**
 * GM-only: delete the campaign (F94). Says exactly what happens first — characters are NOT
 * destroyed, they go back to their owners as standalone; the campaign's crew, clocks, factions,
 * scores, join codes and log are deleted. Two-click confirm.
 */
export function DeleteCampaignCard({ gameId, name }: { gameId: string; name: string }) {
  const { t } = useComponentTranslation();
  const router = useRouter();
  const del = useDeleteGame();
  return (
    <Card variant='danger'>
      <Stack direction='column' gap='sm' align='start'>
        <Heading level='h3' as='h2'>
          {t('deleteCampaign.title')}
        </Heading>
        <Text variant='muted' size='sm'>
          {t('deleteCampaign.explain')}
        </Text>
        <ConfirmButton
          variant='danger-outline'
          // Short visible confirm (the long "Delete “name” for good" wrapped to two lines at
          // 360px); the full, named wording stays the accessible name.
          confirmLabel={t('deleteCampaign.confirmShort')}
          confirmAriaLabel={t('deleteCampaign.confirm', { name })}
          reserveWidth
          loading={del.isPending}
          onConfirm={() =>
            del.mutate(
              { gameId },
              {
                onSuccess: () => {
                  useNotificationStore.getState().success(t('deleteCampaign.done', { name }));
                  router.push('/games');
                },
                onError: err =>
                  useNotificationStore
                    .getState()
                    .error(t('deleteCampaign.failed'), errorMessage(err) || undefined),
              }
            )
          }
        >
          {t('deleteCampaign.cta')}
        </ConfirmButton>
      </Stack>
    </Card>
  );
}
