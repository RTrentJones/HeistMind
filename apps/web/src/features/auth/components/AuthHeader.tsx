'use client';

import Link from 'next/link';
import { useAuth, useAuthActions } from '@/features/auth/stores/auth-store';
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
import { useNotificationStore } from '@/shared/stores/notification-store';
import { errorMessage } from '@/lib/query/result';
import i18n from '@/lib/i18n';
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';

export function AuthHeader() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { signInWithProvider, signOut } = useAuthActions();
  const { t } = useTranslation();

  // Failures surface as a toast (F58 — these were console-only, i.e. invisible to the user).
  const handleDiscordSignIn = async () => {
    try {
      await signInWithProvider('discord');
    } catch (error) {
      console.error('Discord sign in failed:', error);
      useNotificationStore
        .getState()
        .error(i18n.t('errors:auth.signInFailed'), errorMessage(error) || undefined);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
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
              <Link href='/rulesets'>{t('navigation.rulesets')}</Link>
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
        ) : (
          <Stack direction='row' gap='sm' align='center' className='flex-wrap justify-end'>
            <Button variant='ghost' size='sm' onClick={handleDiscordSignIn} loading={isLoading}>
              {t('auth.header.signIn')}
            </Button>
            <Button variant='default' size='sm' onClick={handleDiscordSignIn} loading={isLoading}>
              {t('auth.header.signUpDiscord')}
            </Button>
          </Stack>
        )}
      </HeaderActions>
    </Header>
  );
}
