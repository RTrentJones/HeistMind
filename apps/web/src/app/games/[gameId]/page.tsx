'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Character, GameWithDetails } from '@heist-mind/database';
import {
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
import { RollPanel } from '@/features/rolls/components/RollPanel';
import { RollLog } from '@/features/rolls/components/RollLog';
import { ClocksPanel } from '@/features/clocks/components/ClocksPanel';
import { CrewSheet } from '@/features/crews/components/CrewSheet';

export default function GameDetailPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { isAuthenticated, user } = useAuth();

  const [game, setGame] = useState<GameWithDetails | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rollKey, setRollKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      const repos = getRepositories();
      const gameResult = await repos.games.findWithDetails(gameId);
      if (!active) return;
      if (!gameResult.success || !gameResult.data) {
        setError(
          gameResult.success
            ? 'Game not found'
            : (gameResult.error?.message ?? 'Failed to load game')
        );
        setLoading(false);
        return;
      }
      setGame(gameResult.data);
      const charResult = await repos.characters.findByGame(gameId);
      if (!active) return;
      if (charResult.success) setCharacters(charResult.data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [gameId]);

  if (!isAuthenticated) {
    return (
      <Container maxWidth='md' padding='lg'>
        <Text variant='muted'>Please sign in to view this campaign.</Text>
      </Container>
    );
  }
  if (loading) {
    return (
      <Container maxWidth='md' padding='lg'>
        <LoadingSpinner />
      </Container>
    );
  }
  if (error || !game) {
    return (
      <Container maxWidth='md' padding='lg'>
        <ErrorDisplay title="Couldn't load campaign" message={error ?? 'Unknown error'} />
      </Container>
    );
  }

  return (
    <Container maxWidth='4xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Stack direction='column' gap='xs'>
          <Heading level='h1' variant='hero'>
            {game.name}
          </Heading>
          <Text variant='muted'>
            {game.ruleset.name} · {game.state}
          </Text>
          {game.description && <Text>{game.description}</Text>}
        </Stack>

        <Stack direction='row' justify='between' align='center'>
          <Heading level='h2' variant='primary'>
            Characters
          </Heading>
          <Button asChild variant='ember'>
            <Link href={`/games/${gameId}/characters/new`}>Create character</Link>
          </Button>
        </Stack>

        {characters.length === 0 ? (
          <Text variant='muted'>No characters yet. Create the first one.</Text>
        ) : (
          <Stack direction='column' gap='md'>
            {characters.map(ch => (
              <Card key={ch.id} variant='character'>
                <Stack direction='row' justify='between' align='center'>
                  <div>
                    <Heading level='h3'>{ch.name}</Heading>
                    <Text variant='muted' size='sm'>
                      {ch.playbookType} · {ch.experiencePoints} XP
                    </Text>
                  </div>
                  <Button asChild variant='outline' size='sm'>
                    <Link href={`/games/${gameId}/characters/${ch.id}`}>View</Link>
                  </Button>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}

        <Heading level='h2' variant='primary'>
          Crew
        </Heading>
        <Card variant='outline'>
          <CrewSheet
            gameId={gameId}
            isGm={game.createdBy === user?.id}
            crewRules={game.ruleset.content.crew}
          />
        </Card>

        <Heading level='h2' variant='primary'>
          Clocks
        </Heading>
        <Card variant='outline'>
          <ClocksPanel gameId={gameId} isGm={game.createdBy === user?.id} />
        </Card>

        <Heading level='h2' variant='primary'>
          Roll Log
        </Heading>
        <Card variant='outline'>
          <Stack direction='column' gap='md'>
            <Text variant='muted' size='sm'>
              Fortune / GM roll
            </Text>
            <RollPanel gameId={gameId} onRolled={() => setRollKey(k => k + 1)} />
          </Stack>
        </Card>
        <RollLog gameId={gameId} refreshKey={rollKey} />
      </Stack>
    </Container>
  );
}
