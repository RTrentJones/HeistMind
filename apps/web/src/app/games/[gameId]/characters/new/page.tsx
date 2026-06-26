'use client';

import { Suspense, use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { GameWithDetails } from '@heist-mind/database';
import { Container, ErrorDisplay, LoadingSpinner, Text } from '@heist-mind/ui';
import { getRepositories } from '@/lib/auth';
import { useAuth } from '@/features/auth/stores/auth-store';
import { CharacterCreationWizard } from '@/features/characters/components/CharacterCreationWizard';
import { usePageTranslation } from '@/lib/i18n/hooks';

/** Wizard with the layout chosen by `?layout=rail` (default `single`). */
function WizardWithLayout({ game, gameId }: { game: GameWithDetails; gameId: string }) {
  const layout = useSearchParams().get('layout') === 'rail' ? 'rail' : 'single';
  return <CharacterCreationWizard ruleset={game.ruleset} gameId={gameId} layout={layout} />;
}

export default function NewCharacterPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { isAuthenticated } = useAuth();
  const { t } = usePageTranslation();

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
          setError(result.error?.message ?? t('game.loadFailed'));
        } else if (!result.data) {
          setError(t('game.notFound'));
        } else {
          setGame(result.data);
        }
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : t('game.loadFailed'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [gameId, t]);

  if (!isAuthenticated) {
    return (
      <Container maxWidth='md' padding='lg'>
        <Text variant='muted'>{t('game.createCharAuthPrompt')}</Text>
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
        <ErrorDisplay
          title={t('game.newCharLoadError')}
          message={error ?? t('game.unknownError')}
        />
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
