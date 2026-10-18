'use client';

import Link from 'next/link';
import { Card, Heading, Stack, Text } from '@heist-mind/ui';
import { discordAppId } from '@/lib/discord-install';
import { useComponentTranslation } from '@/lib/i18n/hooks';
import { DiscordInstallLinks } from '@/shared/components/DiscordInstallLinks';

/**
 * GM-only hub card (F94): how to put THIS campaign on Discord — add the bot, run `/heist link`
 * in the channel, players join here + `/character use`. The install button hides itself when the
 * deployment has no Discord app id, and step 1 then stops pointing at it (F95); the steps + the
 * guide link still help.
 */
export function DiscordLinkCard({ campaignName }: { campaignName: string }) {
  const { t } = useComponentTranslation();
  return (
    <Card variant='outline' data-testid='discord-link-card'>
      <Stack direction='column' gap='sm'>
        <Heading level='h3' as='h2'>
          {t('discordLink.title')}
        </Heading>
        <Text variant='muted' size='sm'>
          {t('discordLink.intro')}
        </Text>
        <ol className='list-decimal space-y-1 pl-5 text-sm'>
          <li>{discordAppId() ? t('discordLink.step1') : t('discordLink.step1NoInstall')}</li>
          <li>
            {t('discordLink.step2Lead')}{' '}
            <code className='break-words'>/heist link campaign:{campaignName}</code>{' '}
            {t('discordLink.step2Tail')}
          </li>
          <li>
            {t('discordLink.step3Lead')} <code>/character use</code>.
          </li>
        </ol>
        <DiscordInstallLinks size='sm' />
        <Text variant='muted' size='sm'>
          <Link href='/discord' className='underline'>
            {t('discordLink.guide')}
          </Link>
        </Text>
      </Stack>
    </Card>
  );
}
