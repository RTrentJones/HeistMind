'use client';

import { useEffect, useState } from 'react';
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
import { getRepositories } from '@/lib/auth';
import { useAuth, useAuthActions } from '@/features/auth/stores/auth-store';
import { usePageTranslation } from '@/lib/i18n/hooks';

export default function GamesPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { signInWithProvider } = useAuthActions();
  const { t } = usePageTranslation();
  const router = useRouter();
  const [created, setCreated] = useState<Game[] | null>(null);
  const [joined, setJoined] = useState<Game[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const load = () => {
    const userId = user?.id;
    if (!userId) return;
    const repos = getRepositories();
    repos.games.findByCreator(userId).then(result => {
      if (!result.success) setError(result.error?.message ?? t('gamesList.loadFailed'));
      else setCreated(result.data);
    });
    // findByPlayer returns every game the user is an active member of (including the ones they GM);
    // show only the games they joined as a player here (created ones appear under "Your campaigns").
    repos.games.findByPlayer(userId).then(result => {
      if (result.success) setJoined(result.data);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onJoin = async () => {
    const userId = user?.id;
    if (!userId || !code.trim()) return;
    setJoining(true);
    setJoinError(null);
    const result = await getRepositories().invitations.joinViaCode(
      { gameId: '', inviteCode: code.trim() },
      userId
    );
    setJoining(false);
    if (result.success) {
      setCode('');
      router.push(`/games/${result.data.gameId}`);
    } else {
      setJoinError(t('gamesList.joinFailed'));
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithProvider('discord');
    } catch (err) {
      console.error('Sign in failed:', err);
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

  const createdIds = new Set((created ?? []).map(g => g.id));
  const joinedOnly = (joined ?? []).filter(g => !createdIds.has(g.id));
  const loading = created === null;
  const isEmpty = !loading && (created ?? []).length === 0 && joinedOnly.length === 0;

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
              <Button variant='default' onClick={onJoin} loading={joining} disabled={!code.trim()}>
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

        {error && <ErrorDisplay title={t('gamesList.loadError')} message={error} />}

        {loading ? (
          <LoadingSpinner />
        ) : isEmpty ? (
          <Text variant='muted'>{t('gamesList.empty')}</Text>
        ) : (
          // Created (GM) + joined (Player) campaigns in one list — the per-card role badge
          // distinguishes them, so there are no "…campaigns" sub-headings to collide with the
          // page-title selector in tests.
          <Stack direction='column' gap='md'>
            {(created ?? []).map(game => gameCard(game, 'gm'))}
            {joinedOnly.map(game => gameCard(game, 'player'))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
