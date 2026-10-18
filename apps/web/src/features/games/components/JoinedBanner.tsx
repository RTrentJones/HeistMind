'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, Heading, Stack, Text } from '@heist-mind/ui';
import { usePageTranslation } from '@/lib/i18n/hooks';

/**
 * UX r3 — the "You're in" moment after redeeming an invite (JoinInvite lands on `?joined=1`).
 * The success toast is gone by the time the hub settles, and the first card's only button used to
 * be "Leave campaign"; this says where you are and what to do next. Dismiss drops the query param
 * (so a reload or a shared URL doesn't repeat it).
 */
export function JoinedBanner({ gameId, campaignName }: { gameId: string; campaignName: string }) {
  const { t } = usePageTranslation();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  if (params.get('joined') !== '1') return null;

  return (
    <Card variant='gradient' data-testid='joined-banner' role='status'>
      <Stack direction='column' gap='sm' align='start'>
        <Heading level='h3' as='h2'>
          {t('game.joinedTitle', { name: campaignName })}
        </Heading>
        <Text variant='muted' size='sm'>
          {t('game.joinedBody')}
        </Text>
        <div className='flex flex-wrap gap-2'>
          <Button asChild variant='ember'>
            <Link href={`/games/${gameId}/characters/new`}>{t('game.joinedBuild')}</Link>
          </Button>
          <Button asChild variant='outline'>
            <Link href='/characters'>{t('game.joinedBring')}</Link>
          </Button>
          <Button variant='ghost' onClick={() => router.replace(pathname, { scroll: false })}>
            {t('game.joinedDismiss')}
          </Button>
        </div>
      </Stack>
    </Card>
  );
}
