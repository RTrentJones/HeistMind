'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Game } from '@heist-mind/database';
import {
  Badge,
  Button,
  Card,
  Container,
  ErrorDisplay,
  Heading,
  LoadingSpinner,
  Stack,
  Text,
} from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';

export default function GamesPage() {
  const { user, isAuthenticated } = useAuth();
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let active = true;
    getRepositories()
      .games.findByCreator(userId)
      .then(result => {
        if (!active) return;
        if (!result.success) setError(result.error?.message ?? 'Failed to load campaigns');
        else setGames(result.data);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  if (!isAuthenticated) {
    return (
      <Container maxWidth='md' padding='lg'>
        <Text variant='muted'>Please sign in to view your campaigns.</Text>
      </Container>
    );
  }

  return (
    <Container maxWidth='4xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Stack direction='row' justify='between' align='center'>
          <Heading level='h1' variant='hero'>
            Campaigns
          </Heading>
          <Button asChild variant='ember'>
            <Link href='/games/new'>New campaign</Link>
          </Button>
        </Stack>

        {error && <ErrorDisplay title="Couldn't load campaigns" message={error} />}

        {games === null ? (
          <LoadingSpinner />
        ) : games.length === 0 ? (
          <Text variant='muted'>No campaigns yet. Create one to get started.</Text>
        ) : (
          <Stack direction='column' gap='md'>
            {games.map(game => (
              <Card key={game.id} variant='outline'>
                <Stack direction='row' justify='between' align='center'>
                  <div>
                    <Heading level='h3'>{game.name}</Heading>
                    {game.description && (
                      <Text variant='muted' size='sm'>
                        {game.description}
                      </Text>
                    )}
                  </div>
                  <Stack direction='row' gap='sm' align='center'>
                    <Badge variant='steel'>{game.state}</Badge>
                    <Button asChild variant='outline' size='sm'>
                      <Link href={`/games/${game.id}`}>Open</Link>
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
