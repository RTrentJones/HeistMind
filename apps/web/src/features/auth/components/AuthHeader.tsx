'use client';

import Link from 'next/link';
import { useAuth, useAuthActions } from '@/features/auth/stores/auth-store';
import { Button, Header, HeaderBrand, HeaderActions, Heading, Text, Stack } from '@heist-mind/ui';

export function AuthHeader() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { signInWithProvider, signOut } = useAuthActions();

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

      <HeaderActions>
        {isAuthenticated && user ? (
          <Stack direction='row' gap='md' align='center'>
            <Button asChild variant='ghost' size='sm'>
              <Link href='/games'>Campaigns</Link>
            </Button>
            <Button asChild variant='ghost' size='sm'>
              <Link href='/rulesets'>Rulesets</Link>
            </Button>
            <Text size='sm' variant='muted'>
              Welcome, {user.profile?.displayName || user.email}
            </Text>
            <Button variant='outline' size='sm' onClick={handleSignOut} loading={isLoading}>
              Sign Out
            </Button>
          </Stack>
        ) : (
          <Stack direction='row' gap='sm' align='center'>
            <Button variant='ghost' size='sm' onClick={handleDiscordSignIn} loading={isLoading}>
              Sign In
            </Button>
            <Button variant='default' size='sm' onClick={handleDiscordSignIn} loading={isLoading}>
              Sign Up with Discord
            </Button>
          </Stack>
        )}
      </HeaderActions>
    </Header>
  );
}
