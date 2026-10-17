'use client';

import { Button, Stack, Text } from '@heist-mind/ui';
import { discordAppId, discordInstallUrl } from '@/lib/discord-install';
import { useComponentTranslation } from '@/lib/i18n/hooks';

/**
 * "Add HeistMind to your Discord server" (+ optionally the user-install link). Renders NOTHING when
 * NEXT_PUBLIC_DISCORD_APP_ID isn't configured, so a deployment without the app never shows a dead
 * button. Opens Discord's own install screen in a new tab.
 */
export function DiscordInstallLinks({
  showUserInstall = false,
  size = 'default',
}: {
  showUserInstall?: boolean;
  size?: 'sm' | 'default';
}) {
  const { t } = useComponentTranslation();
  const appId = discordAppId();
  if (!appId) return null;
  return (
    <Stack direction='column' gap='xs' align='start' data-testid='discord-install'>
      <Button asChild variant='default' size={size}>
        <a href={discordInstallUrl(appId, 'server')} target='_blank' rel='noopener noreferrer'>
          {t('discordInstall.server')}
        </a>
      </Button>
      {showUserInstall && (
        <Text variant='muted' size='sm'>
          {t('discordInstall.userLead')}{' '}
          <a
            href={discordInstallUrl(appId, 'user')}
            target='_blank'
            rel='noopener noreferrer'
            className='underline'
          >
            {t('discordInstall.user')}
          </a>
        </Text>
      )}
    </Stack>
  );
}
