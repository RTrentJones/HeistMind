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
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';

export function AuthHeader() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { signInWithProvider, signOut } = useAuthActions();
  const { t } = useTranslation();

  const handleDiscordSignIn = async () => {
    try {
      await signInWithProvider('discord');
    } catch (error) {
      console.error('Discord sign in failed:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
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
            {/* The welcome line is the first thing to drop on a narrow header. */}
            <Text size='sm' variant='muted' className='hidden sm:block'>
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
