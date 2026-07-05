'use client';

import { Button, Card, Container, Heading, Stack, Text } from '@heist-mind/ui';
import { ClickwrapNotice } from '@/features/auth/components/ClickwrapNotice';
import { useSignIn } from '@/features/auth/hooks/use-sign-in';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * The signed-out gate for an auth-required page: heading + page-specific prompt + a working
 * Discord sign-in button. One implementation — the pages used to hand-roll this (two full copies,
 * two button-less text variants that dead-ended the user).
 */
export function SignInGate({ prompt, heading }: { prompt: string; heading?: string }) {
  const { t } = useTranslation();
  const { signIn, isSigningIn } = useSignIn();

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
