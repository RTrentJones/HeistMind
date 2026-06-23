'use client';

import { Suspense, use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { GameWithDetails } from '@heist-mind/database';
import { Container, ErrorDisplay, LoadingSpinner, Text } from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';
import { CharacterCreationWizard } from '@/features/characters/components/CharacterCreationWizard';

/** Wizard with the layout chosen by `?layout=rail` (default `single`). */
function WizardWithLayout({ game, gameId }: { game: GameWithDetails; gameId: string }) {
  const layout = useSearchParams().get('layout') === 'rail' ? 'rail' : 'single';
  return <CharacterCreationWizard ruleset={game.ruleset} gameId={gameId} layout={layout} />;
}

export default function NewCharacterPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { isAuthenticated } = useAuth();

  const [game, setGame] = useState<GameWithDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getRepositories()
      .games.findWithDetails(gameId)
      .then(result => {
        if (!active) return;
        if (!result.success) {
          setError(result.error?.message ?? 'Failed to load game');
        } else if (!result.data) {
          setError('Game not found');
        } else {
          setGame(result.data);
        }
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load game');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [gameId]);

  if (!isAuthenticated) {
    return (
      <Container maxWidth="md" padding="lg">
        <Text variant="muted">Please sign in to create a character.</Text>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="md" padding="lg">
        <LoadingSpinner />
      </Container>
    );
  }

  if (error || !game) {
    return (
      <Container maxWidth="md" padding="lg">
        <ErrorDisplay title="Couldn't load game" message={error ?? 'Unknown error'} />
      </Container>
    );
  }

  return (
    <main>
      <Suspense fallback={null}>
        <WizardWithLayout game={game} gameId={gameId} />
      </Suspense>
    </main>
  );
}
