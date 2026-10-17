'use client';

import { usePathname } from 'next/navigation';
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
 * Signing in from the gate returns to the gated page (F94), not the dashboard.
 */
export function SignInGate({
  prompt,
  heading,
  next,
}: {
  prompt: string;
  heading?: string;
  /** Where to land after sign-in — defaults to THIS page, so a shared link keeps its intent. */
  next?: string;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
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
          <Heading level='h2' as='h1' variant='primary'>
            {heading ?? t('auth.gate.heading')}
          </Heading>
          <Text variant='muted'>{prompt}</Text>
          <Button
            variant='default'
            onClick={() => void signIn({ next: next ?? pathname })}
            loading={isSigningIn}
          >
            {t('auth.gate.signInCta')}
          </Button>
          <ClickwrapNotice />
        </Stack>
      </Card>
    </Container>
  );
}
