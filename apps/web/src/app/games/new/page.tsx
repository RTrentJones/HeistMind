'use client';

import { Suspense } from 'react';
import { Container, Heading, Stack, Text } from '@heist-mind/ui';
import { SignInGate } from '@/features/auth/components/SignInGate';
import { useAuth } from '@/features/auth/stores/auth-store';
import { GameForm } from '@/features/games/components/GameForm';
import { usePageTranslation } from '@/lib/i18n/hooks';

export default function NewGamePage() {
  const { isAuthenticated } = useAuth();
  const { t } = usePageTranslation();

  if (!isAuthenticated) {
    return <SignInGate heading={t('createGame.title')} prompt={t('createGame.authPrompt')} />;
  }

  return (
    <Container maxWidth='3xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Stack direction='column' gap='xs'>
          <Heading level='h1' variant='hero'>
            {t('createGame.title')}
          </Heading>
          <Text variant='muted'>{t('createGame.subtitle')}</Text>
        </Stack>
        <Suspense fallback={null}>
          <GameForm />
        </Suspense>
      </Stack>
    </Container>
  );
}
