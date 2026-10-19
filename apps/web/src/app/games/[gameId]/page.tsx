'use client';

import { Suspense, use } from 'react';
import Link from 'next/link';
import { campaignCapacity, type GameState } from '@heist-mind/core';
import {
  Badge,
  Button,
  Card,
  Container,
  ErrorDisplay,
  Heading,
  LoadingSpinner,
  Select,
  Stack,
  Text,
  Tooltip,
} from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { SignInGate } from '@/features/auth/components/SignInGate';
import { useCharactersByGame } from '@/features/characters/data/queries';
import { useGameDetail } from '@/features/games/data/queries';
import { useUpdateGameState } from '@/features/games/data/mutations';
import { usePageTranslation, useTranslation } from '@/lib/i18n/hooks';
import { QueryError, QueryLoading } from '@/shared/components/QueryStates';
import { gameStateLabel } from '@/features/rolls/lib/labels';
import { errorMessage } from '@/lib/query/result';
import { useNotificationStore } from '@/shared/stores/notification-store';
import { InviteCodeSection } from '@/features/games/components/InviteCodeSection';
import { MembersPanel } from '@/features/games/components/MembersPanel';
import { DiscordLinkCard } from '@/features/games/components/DiscordLinkCard';
import { DeleteCampaignCard } from '@/features/games/components/DeleteCampaignCard';
import { JoinedBanner } from '@/features/games/components/JoinedBanner';
import { CampaignSetup } from '@/features/games/components/CampaignSetup';
import { RollPanel } from '@/features/rolls/components/RollPanel';
import { RollLog } from '@/features/rolls/components/RollLog';
import { AddResultForm } from '@/features/rolls/components/AddResultForm';
import { ClocksPanel } from '@/features/clocks/components/ClocksPanel';
import { CrewSheet } from '@/features/crews/components/CrewSheet';
import { FactionsPanel } from '@/features/factions/components/FactionsPanel';
import { ScorePanel } from '@/features/scores/components/ScorePanel';
import { CharacterRoster } from '@/features/characters/components/CharacterRoster';

// The campaign lifecycle, in play order (mirrors core's GameState union).
const GAME_STATES: GameState[] = ['draft', 'recruiting', 'active', 'paused', 'completed'];

export default function GameDetailPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { isAuthenticated, user } = useAuth();
  const { t } = usePageTranslation();
  const { t: tAll } = useTranslation();

  const gameQuery = useGameDetail(gameId);
  const updateState = useUpdateGameState(gameId);
  const charactersQuery = useCharactersByGame(gameId);
  const game = gameQuery.data ?? null;
  const characters = charactersQuery.data ?? [];

  if (!isAuthenticated) {
    return <SignInGate prompt={t('game.viewAuthPrompt')} />;
  }
  if (gameQuery.isLoading) {
    // F99 — the SAME width as the loaded hub's Container: React reuses this node when the data
    // lands, and a 448px→full-width box (x 160→0) was the hub's biggest layout shift (0.135 of
    // ~0.18 at 768) — not the entrance animation the round-4 audit suspected.
    return (
      <Container maxWidth='4xl' padding='lg'>
        <LoadingSpinner />
      </Container>
    );
  }
  // findWithDetails resolves to null when the game doesn't exist; a thrown query is a real load error.
  if (gameQuery.isError || !game) {
    const message = gameQuery.isError
      ? ((gameQuery.error as Error | null)?.message ?? t('game.loadFailed'))
      : t('game.notFound');
    // A real load error gets a retry; either way there's a way back to the campaign list.
    return (
      <Container maxWidth='md' padding='lg'>
        <ErrorDisplay
          title={t('game.hubLoadError')}
          message={message}
          {...(gameQuery.isError
            ? {
                onRetry: () => void gameQuery.refetch(),
                retryText: tAll('components.asyncState.retry'),
              }
            : {})}
        >
          <Link href='/games' className='underline'>
            {tAll('components.asyncState.backToCampaigns')}
          </Link>
        </ErrorDisplay>
      </Container>
    );
  }

  const isGm = game.createdBy === user?.id;
  // Setup starts open while the GM is still alone in the campaign; once players are in it folds
  // away so a returning GM lands on the table, not on invites (UX r3: Characters sat at y≈1130).
  const hasPlayers = game.players.some(p => p.status === 'active' && p.playerId !== game.createdBy);

  return (
    <Container maxWidth='4xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Stack direction='column' gap='xs'>
          <Heading level='h1' variant='hero'>
            {game.name}
          </Heading>
          <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
            <Text variant='muted'>{game.ruleset.name} ·</Text>
            {isGm ? (
              // F32 — the GM moves the campaign through its lifecycle right where it's shown.
              <Tooltip variant='dark' content={t('gamesList.stateLegend')}>
                <span>
                  <Select
                    aria-label={t('game.stateLabel')}
                    selectSize='sm'
                    value={game.state}
                    disabled={updateState.isPending}
                    onChange={e => {
                      const userId = user?.id;
                      if (!userId) return;
                      updateState.mutate(
                        { userId, state: e.target.value as GameState },
                        {
                          // The select snapped back silently on failure (review item 6).
                          onError: err =>
                            useNotificationStore
                              .getState()
                              .error(
                                tAll('components.asyncState.stateChangeFailed'),
                                errorMessage(err) || undefined
                              ),
                        }
                      );
                    }}
                  >
                    {GAME_STATES.map(s => (
                      <option key={s} value={s}>
                        {gameStateLabel(s, tAll)}
                      </option>
                    ))}
                  </Select>
                </span>
              </Tooltip>
            ) : (
              <Tooltip variant='dark' content={t('gamesList.stateLegend')}>
                <Badge variant='outline'>{gameStateLabel(game.state, tAll)}</Badge>
              </Tooltip>
            )}
          </Stack>
          {game.description && <Text>{game.description}</Text>}
        </Stack>

        <Suspense fallback={null}>
          <JoinedBanner gameId={gameId} campaignName={game.name} />
        </Suspense>

        {isGm && (
          <CampaignSetup initiallyOpen={!hasPlayers}>
            <InviteCodeSection gameId={gameId} capacity={campaignCapacity(game)} />
            <MembersPanel game={game} userId={user?.id} />
            <DiscordLinkCard campaignName={game.name} />
          </CampaignSetup>
        )}

        <Stack direction='row' justify='between' align='center' className='flex-wrap gap-2'>
          <Heading level='h2' variant='primary'>
            {t('game.charactersHeading')}
          </Heading>
          <Button asChild variant='ember'>
            <Link href={`/games/${gameId}/characters/new`}>{t('game.createCharacter')}</Link>
          </Button>
        </Stack>

        {/* Loading / error / empty stay distinct — no "No characters yet" flash (review item 7). */}
        {charactersQuery.isPending ? (
          <QueryLoading testId='roster-loading' />
        ) : charactersQuery.isError ? (
          <QueryError
            title={tAll('components.asyncState.rosterLoadFailed')}
            message={charactersQuery.error.message}
            onRetry={() => void charactersQuery.refetch()}
          />
        ) : characters.length === 0 ? (
          <Text variant='muted'>{t('game.noCharacters')}</Text>
        ) : (
          <CharacterRoster
            rulesetContent={game.ruleset.content}
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
          <CrewSheet gameId={gameId} isGm={isGm} crewRules={game.ruleset.content.crew} />
        </Card>

        <Heading level='h2' variant='primary'>
          {t('game.clocksHeading')}
        </Heading>
        <Card variant='outline'>
          <ClocksPanel gameId={gameId} isGm={isGm} />
        </Card>

        <Heading level='h2' variant='primary'>
          {t('game.factionsHeading')}
        </Heading>
        <Card variant='outline'>
          <FactionsPanel gameId={gameId} isGm={isGm} suggestions={game.ruleset.content.factions} />
        </Card>

        <Heading level='h2' variant='primary'>
          {t('game.scoreHeading')}
        </Heading>
        <Card variant='outline'>
          <ScorePanel gameId={gameId} isGm={isGm} gameState={game.state} />
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
        {/* Players: who's in + Leave, after the table (it used to be the first card, so a fresh
            joiner's only visible action was "Leave campaign"). */}
        {!isGm && <MembersPanel game={game} userId={user?.id} />}
        {isGm && <DeleteCampaignCard gameId={gameId} name={game.name} />}
      </Stack>
    </Container>
  );
}
