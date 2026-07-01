'use client';

import { use } from 'react';
import Link from 'next/link';
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
import { useAuth } from '@/features/auth/stores/auth-store';
import { useCharactersByGame } from '@/features/characters/data/queries';
import { useGameDetail } from '@/features/games/data/queries';
import { usePageTranslation } from '@/lib/i18n/hooks';
import { InviteCodeSection } from '@/features/games/components/InviteCodeSection';
import { RollPanel } from '@/features/rolls/components/RollPanel';
import { RollLog } from '@/features/rolls/components/RollLog';
import { AddResultForm } from '@/features/rolls/components/AddResultForm';
import { ClocksPanel } from '@/features/clocks/components/ClocksPanel';
import { CrewSheet } from '@/features/crews/components/CrewSheet';
import { FactionsPanel } from '@/features/factions/components/FactionsPanel';
import { ScorePanel } from '@/features/scores/components/ScorePanel';
import { CharacterRoster } from '@/features/characters/components/CharacterRoster';

export default function GameDetailPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { isAuthenticated, user } = useAuth();
  const { t } = usePageTranslation();

  const gameQuery = useGameDetail(gameId);
  const charactersQuery = useCharactersByGame(gameId);
  const game = gameQuery.data ?? null;
  const characters = charactersQuery.data ?? [];

  if (!isAuthenticated) {
    return (
      <Container maxWidth='md' padding='lg'>
        <Text variant='muted'>{t('game.viewAuthPrompt')}</Text>
      </Container>
    );
  }
  if (gameQuery.isLoading) {
    return (
      <Container maxWidth='md' padding='lg'>
        <LoadingSpinner />
      </Container>
    );
  }
  // findWithDetails resolves to null when the game doesn't exist; a thrown query is a real load error.
  if (gameQuery.isError || !game) {
    const message = gameQuery.isError
      ? ((gameQuery.error as Error | null)?.message ?? t('game.loadFailed'))
      : t('game.notFound');
    return (
      <Container maxWidth='md' padding='lg'>
        <ErrorDisplay title={t('game.hubLoadError')} message={message} />
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

        {game.createdBy === user?.id && <InviteCodeSection gameId={gameId} />}

        <Stack direction='row' justify='between' align='center'>
          <Heading level='h2' variant='primary'>
            {t('game.charactersHeading')}
          </Heading>
          <Button asChild variant='ember'>
            <Link href={`/games/${gameId}/characters/new`}>{t('game.createCharacter')}</Link>
          </Button>
        </Stack>

        {characters.length === 0 ? (
          <Text variant='muted'>{t('game.noCharacters')}</Text>
        ) : (
          <CharacterRoster
            gameId={gameId}
            gmId={game.createdBy}
            userId={user?.id}
            characters={characters}
          />
        )}

        <Heading level='h2' variant='primary'>
          {t('game.crewHeading')}
        </Heading>
        <Card variant='outline'>
          <CrewSheet
            gameId={gameId}
            isGm={game.createdBy === user?.id}
            crewRules={game.ruleset.content.crew}
          />
        </Card>

        <Heading level='h2' variant='primary'>
          {t('game.clocksHeading')}
        </Heading>
        <Card variant='outline'>
          <ClocksPanel gameId={gameId} isGm={game.createdBy === user?.id} />
        </Card>

        <Heading level='h2' variant='primary'>
          {t('game.factionsHeading')}
        </Heading>
        <Card variant='outline'>
          <FactionsPanel
            gameId={gameId}
            isGm={game.createdBy === user?.id}
            suggestions={game.ruleset.content.factions}
          />
        </Card>

        <Heading level='h2' variant='primary'>
          {t('game.scoreHeading')}
        </Heading>
        <Card variant='outline'>
          <ScorePanel gameId={gameId} isGm={game.createdBy === user?.id} />
        </Card>

        <Heading level='h2' variant='primary'>
          {t('game.rollLogHeading')}
        </Heading>
        <Card variant='outline'>
          <Stack direction='column' gap='md'>
            <Text variant='muted' size='sm'>
              {t('game.fortuneRoll')}
            </Text>
            <RollPanel gameId={gameId} />
            <Text variant='muted' size='sm'>
              {t('game.recordResult')}
            </Text>
            <AddResultForm gameId={gameId} characters={characters} />
          </Stack>
        </Card>
        <RollLog gameId={gameId} />
      </Stack>
    </Container>
  );
}
