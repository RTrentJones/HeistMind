'use client';

import Link from 'next/link';
import { useAuth, useAuthActions } from '@/features/auth/stores/auth-store';
import { ClickwrapNotice } from '@/features/auth/components/ClickwrapNotice';
import { COMING_SOON } from '@/lib/coming-soon';
import { useSignIn } from '@/features/auth/hooks/use-sign-in';
import {
  Button,
  Header,
  HeaderBrand,
  HeaderActions,
  Heading,
  Text,
  Stack,
  ThemeToggle,
} from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';
import { captureError } from '@heist-mind/telemetry';
import { useNotificationStore } from '@/shared/stores/notification-store';
import { errorMessage } from '@/lib/query/result';
import i18n from '@/lib/i18n';
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';

export function AuthHeader() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { signOut } = useAuthActions();
  const { t } = useTranslation();
  const { signIn: handleDiscordSignIn } = useSignIn();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      captureError(error, { 'error.surface': 'auth.sign-out' });
      useNotificationStore
        .getState()
        .error(i18n.t('errors:auth.signOutFailed'), errorMessage(error) || undefined);
    }
  };

  return (
    <Header>
      <HeaderBrand>
        <Heading level='h1' variant='default' as='h1'>
          <span className='text-brand-primary'>Heist</span>Mind
        </Heading>
      </HeaderBrand>

      <HeaderActions className='flex-wrap justify-end'>
        <LanguageSwitcher />
        <ThemeToggle />
        {isAuthenticated && user ? (
          <Stack direction='row' gap='sm' align='center' className='flex-wrap justify-end'>
            <Button asChild variant='ghost' size='sm'>
              <Link href='/games'>{t('navigation.campaigns')}</Link>
            </Button>
            <Button asChild variant='ghost' size='sm'>
              <Link href='/characters'>{t('navigation.characters')}</Link>
            </Button>
            <Button asChild variant='ghost' size='sm'>
              <Link href='/rulesets'>{t('navigation.rulesets')}</Link>
            </Button>
            <Button asChild variant='ghost' size='sm'>
              <Link href='/settings'>{t('navigation.settings')}</Link>
            </Button>
            <Text size='sm' variant='muted'>
              {t('auth.header.welcomeUser', {
                name: user.profile?.displayName || user.email || '',
              })}
            </Text>
            <Button variant='outline' size='sm' onClick={handleSignOut} loading={isLoading}>
              {t('auth.header.signOut')}
            </Button>
          </Stack>
        ) : COMING_SOON ? null : (
          // Prod is behind the always-on coming-soon gate (main only) — no sign-in is shown.
          <Stack direction='row' gap='sm' align='center' className='flex-wrap justify-end'>
            <Button variant='ghost' size='sm' onClick={handleDiscordSignIn} loading={isLoading}>
              {t('auth.header.signIn')}
            </Button>
            <Button variant='default' size='sm' onClick={handleDiscordSignIn} loading={isLoading}>
              {t('auth.header.signUpDiscord')}
            </Button>
            {/* w-full drops the notice to its own wrapped line; hidden on phones — the page-level
                notices (hero CTA / SignInGate) carry the clickwrap there. max-sm:hidden, NOT
                `hidden sm:block`: the ui package's stylesheet re-declares `.hidden` after the
                app's responsive rules, so the sm:block override never wins (F83). */}
            <ClickwrapNotice className='max-sm:hidden w-full text-right' />
          </Stack>
        )}
      </HeaderActions>
    </Header>
  );
}
