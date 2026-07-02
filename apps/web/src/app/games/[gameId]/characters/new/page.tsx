'use client';

import { Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import type { GameWithDetails } from '@heist-mind/core';
import { Container, ErrorDisplay, LoadingSpinner, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useGameDetail } from '@/features/games/data/queries';
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
  const game = useGameDetail(gameId);

  if (!isAuthenticated) {
    return (
      <Container maxWidth='md' padding='lg'>
        <Text variant='muted'>{t('game.createCharAuthPrompt')}</Text>
      </Container>
    );
  }

  if (game.isLoading) {
    return (
      <Container maxWidth='md' padding='lg'>
        <LoadingSpinner />
      </Container>
    );
  }

  if (game.isError || !game.data) {
    return (
      <Container maxWidth='md' padding='lg'>
        <ErrorDisplay
          title={t('game.newCharLoadError')}
          message={
            game.isError ? (game.error?.message ?? t('game.loadFailed')) : t('game.notFound')
          }
        />
      </Container>
    );
  }

  return (
    // The app shell provides the <main> landmark; this is just the wizard's container.
    <div>
      <Suspense fallback={null}>
        <WizardWithLayout game={game.data} gameId={gameId} />
      </Suspense>
    </div>
  );
}
