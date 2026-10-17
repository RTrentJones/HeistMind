'use client';

import { useRouter } from 'next/navigation';
import { Card, Heading, Stack, Text } from '@heist-mind/ui';
import { useDeleteCharacter } from '@/features/characters/data/mutations';
import { useComponentTranslation } from '@/lib/i18n/hooks';
import { errorMessage } from '@/lib/query/result';
import { ConfirmButton } from '@/shared/components/ConfirmButton';
import { useNotificationStore } from '@/shared/stores/notification-store';

/** Owner-only, bottom of the sheet (F94): delete this character for good — two-click confirm. */
export function DeleteCharacterCard({ characterId, name }: { characterId: string; name: string }) {
  const { t } = useComponentTranslation();
  const router = useRouter();
  const del = useDeleteCharacter();
  return (
    <Card variant='outline' className='max-sm:order-last'>
      <Stack direction='column' gap='sm' align='start'>
        <Heading level='h3' as='h2'>
          {t('deleteCharacter.title')}
        </Heading>
        <Text variant='muted' size='sm'>
          {t('deleteCharacter.explain')}
        </Text>
        <ConfirmButton
          confirmLabel={t('deleteCharacter.confirm', { name })}
          loading={del.isPending}
          onConfirm={() =>
            del.mutate(
              { characterId },
              {
                onSuccess: () => {
                  useNotificationStore.getState().success(t('deleteCharacter.done', { name }));
                  router.push('/characters');
                },
                onError: err =>
                  useNotificationStore
                    .getState()
                    .error(t('deleteCharacter.failed'), errorMessage(err) || undefined),
              }
            )
          }
        >
          {t('deleteCharacter.cta')}
        </ConfirmButton>
      </Stack>
    </Card>
  );
}
