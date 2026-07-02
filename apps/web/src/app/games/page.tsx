'use client';

import Link from 'next/link';
import { Button, Container, Heading, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { SignInGate } from '@/features/auth/components/SignInGate';
import { GameCard } from '@/features/games/components/GameCard';
import { JoinByCodeCard } from '@/features/games/components/JoinByCodeCard';
import { useGamesByCreator, useGamesByPlayer } from '@/features/games/data/queries';
import { ResourceList } from '@/shared/components/ResourceList';
import { usePageTranslation } from '@/lib/i18n/hooks';

/** The campaigns hub: join by code, then every campaign the user runs (GM) or plays in. */
export default function GamesPage() {
  const { user, isAuthenticated } = useAuth();
  const { t } = usePageTranslation();
  // Created (GM) + joined (member, incl. GM'd games — filtered to player-only below).
  const created = useGamesByCreator(user?.id);
  const joined = useGamesByPlayer(user?.id);

  if (!isAuthenticated) {
    return <SignInGate heading={t('gamesList.authHeading')} prompt={t('gamesList.authPrompt')} />;
  }

  const createdGames = created.data ?? [];
  const createdIds = new Set(createdGames.map(g => g.id));
  const joinedOnly = (joined.data ?? []).filter(g => !createdIds.has(g.id));

  return (
    <Container maxWidth='4xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Stack direction='row' justify='between' align='center'>
          <Heading level='h1' variant='hero'>
            {t('gamesList.title')}
          </Heading>
          <Button asChild variant='ember'>
            <Link href='/games/new'>{t('gamesList.newCampaign')}</Link>
          </Button>
        </Stack>

        <JoinByCodeCard />

        <ResourceList
          isLoading={created.isLoading}
          isError={created.isError}
          errorTitle={t('gamesList.loadError')}
          errorText={created.error?.message ?? t('gamesList.loadFailed')}
          isEmpty={createdGames.length === 0 && joinedOnly.length === 0}
          emptyContent={<Text variant='muted'>{t('gamesList.empty')}</Text>}
        >
          {/* Created (GM) + joined (Player) campaigns in one list — the per-card role badge
              distinguishes them, so there are no "…campaigns" sub-headings to collide with the
              page-title selector in tests. */}
          {createdGames.map(game => (
            <GameCard key={game.id} game={game} role='gm' />
          ))}
          {joinedOnly.map(game => (
            <GameCard key={game.id} game={game} role='player' />
          ))}
        </ResourceList>
      </Stack>
    </Container>
  );
}
