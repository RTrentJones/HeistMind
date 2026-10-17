'use client';

import { Button, Card, Container, Heading, LoadingSpinner, Stack, Text } from '@heist-mind/ui';
import { ClickwrapNotice } from '@/features/auth/components/ClickwrapNotice';
import { useSignIn } from '@/features/auth/hooks/use-sign-in';
import { useAuthStore } from '@/features/auth/stores/auth-store';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * The signed-out gate for an auth-required page: heading + page-specific prompt + a working
 * Discord sign-in button. One implementation — the pages used to hand-roll this (two full copies,
 * two button-less text variants that dead-ended the user).
 *
 * Until the persisted auth hint has been read (after mount — see `rehydrateAuthStore`), the store
 * reports signed-out on every render, including the server HTML. Rather than paint a "sign in"
 * prompt at a returning signed-in user, the gate holds a neutral spinner until hydration settles.
 */
export function SignInGate({ prompt, heading }: { prompt: string; heading?: string }) {
  const { t } = useTranslation();
  const { signIn, isSigningIn } = useSignIn();
  const hasHydrated = useAuthStore(state => state.hasHydrated);

  if (!hasHydrated) {
    return (
      <Container maxWidth='md' padding='lg'>
        <LoadingSpinner />
      </Container>
    );
  }

  return (
    <Container maxWidth='md' padding='lg'>
      <Card variant='outline'>
        <Stack direction='column' gap='md' align='start'>
          <Heading level='h2' variant='primary'>
            {heading ?? t('auth.gate.heading')}
          </Heading>
          <Text variant='muted'>{prompt}</Text>
          <Button variant='default' onClick={() => void signIn()} loading={isSigningIn}>
            {t('auth.gate.signInCta')}
          </Button>
          <ClickwrapNotice />
        </Stack>
      </Card>
    </Container>
  );
}
