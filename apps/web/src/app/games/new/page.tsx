'use client';

import { Suspense } from 'react';
import { Container, Heading, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { GameForm } from '@/features/games/components/GameForm';

export default function NewGamePage() {
  const { isAuthenticated } = useAuth();

  return (
    <Container maxWidth='3xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Stack direction='column' gap='xs'>
          <Heading level='h1' variant='hero'>
            Create a Campaign
          </Heading>
          <Text variant='muted'>Spin up a new game from one of your rulesets.</Text>
        </Stack>
        {isAuthenticated ? (
          <Suspense fallback={null}>
            <GameForm />
          </Suspense>
        ) : (
          <Text variant='muted'>Please sign in to create a campaign.</Text>
        )}
      </Stack>
    </Container>
  );
}
