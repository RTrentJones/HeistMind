'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Game } from '@heist-mind/database';
import {
  Badge,
  Button,
  Card,
  Container,
  ErrorDisplay,
  Heading,
  Input,
  LoadingSpinner,
  Stack,
  Text,
  Tooltip,
} from '@heist-mind/ui';
import { useAuth, useAuthActions } from '@/features/auth/stores/auth-store';
import { useNotificationStore } from '@/shared/stores/notification-store';
import { errorMessage } from '@/lib/query/result';
import i18n from '@/lib/i18n';
import { usePageTranslation } from '@/lib/i18n/hooks';
import { useGamesByCreator, useGamesByPlayer } from '@/features/games/data/queries';
import { useJoinViaCode } from '@/features/invitations/data/mutations';

export default function GamesPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { signInWithProvider } = useAuthActions();
  const { t } = usePageTranslation();
  const router = useRouter();
  // Created (GM) + joined (member, incl. GM'd games — filtered to player-only below).
  const created = useGamesByCreator(user?.id);
  const joined = useGamesByPlayer(user?.id);
  const join = useJoinViaCode();
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const onJoin = async () => {
    const userId = user?.id;
    if (!userId || !code.trim()) return;
    setJoinError(null);
    try {
      const member = await join.mutateAsync({ userId, inviteCode: code.trim() });
      setCode('');
      router.push(`/games/${member.gameId}`);
    } catch {
      setJoinError(t('gamesList.joinFailed'));
    }
  };

  // Failures surface as a toast (F58 — these were console-only, i.e. invisible to the user).
  const handleSignIn = async () => {
    try {
      await signInWithProvider('discord');
    } catch (err) {
      console.error('Sign in failed:', err);
      useNotificationStore
        .getState()
        .error(i18n.t('errors:auth.signInFailed'), errorMessage(err) || undefined);
    }
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth='md' padding='lg'>
        <Card variant='outline'>
          <Stack direction='column' gap='md' align='start'>
            <Heading level='h2' variant='primary'>
              {t('gamesList.authHeading')}
            </Heading>
            <Text variant='muted'>{t('gamesList.authPrompt')}</Text>
            <Button variant='default' onClick={handleSignIn} loading={isLoading}>
              {t('gamesList.signInCta')}
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  const createdGames = created.data ?? [];
  const createdIds = new Set(createdGames.map(g => g.id));
  const joinedOnly = (joined.data ?? []).filter(g => !createdIds.has(g.id));
  const loading = created.isLoading;
  const isEmpty = !loading && createdGames.length === 0 && joinedOnly.length === 0;

  const gameCard = (game: Game, role: 'gm' | 'player') => (
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
          <Badge variant={role === 'gm' ? 'ember' : 'steel'}>
            {role === 'gm' ? t('gamesList.gmBadge') : t('gamesList.playerBadge')}
          </Badge>
          <Tooltip variant='dark' size='lg' content={t('gamesList.stateLegend')}>
            <span tabIndex={0} className='cursor-help'>
              <Badge variant='outline'>{game.state}</Badge>
            </span>
          </Tooltip>
          <Button asChild variant='outline' size='sm'>
            <Link href={`/games/${game.id}`}>{t('gamesList.open')}</Link>
          </Button>
        </Stack>
      </Stack>
    </Card>
  );

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

        {/* Join a campaign with an invite code */}
        <Card variant='outline'>
          <Stack direction='column' gap='sm'>
            <Heading level='h3'>{t('gamesList.joinTitle')}</Heading>
            <Stack direction='row' gap='sm' align='end' className='flex-wrap'>
              <Input
                label={t('gamesList.codeLabel')}
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder={t('gamesList.joinPlaceholder')}
              />
              <Button
                variant='default'
                onClick={onJoin}
                loading={join.isPending}
                disabled={!code.trim()}
              >
                {t('gamesList.joinCta')}
              </Button>
            </Stack>
            {joinError && (
              <Text variant='muted' size='sm' className='text-semantic-error'>
                {joinError}
              </Text>
            )}
          </Stack>
        </Card>

        {created.isError && (
          <ErrorDisplay
            title={t('gamesList.loadError')}
            message={(created.error as Error)?.message ?? t('gamesList.loadFailed')}
          />
        )}

        {loading ? (
          <LoadingSpinner />
        ) : isEmpty ? (
          <Text variant='muted'>{t('gamesList.empty')}</Text>
        ) : (
          // Created (GM) + joined (Player) campaigns in one list — the per-card role badge
          // distinguishes them, so there are no "…campaigns" sub-headings to collide with the
          // page-title selector in tests.
          <Stack direction='column' gap='md'>
            {createdGames.map(game => gameCard(game, 'gm'))}
            {joinedOnly.map(game => gameCard(game, 'player'))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
