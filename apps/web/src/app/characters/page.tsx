'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Character, Game } from '@heist-mind/database';
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
import { usePageTranslation } from '@/lib/i18n/hooks';
import { CharacterCard } from '@/features/characters/components/CharacterCard';

/**
 * "My Characters" (Phase 5) — every character the user owns, standalone or in a campaign. The
 * campaign-independent home for character sheets; a standalone one links to `/characters/[id]`, an
 * in-campaign one to its game route.
 */
export default function MyCharactersPage() {
  const { user, isAuthenticated } = useAuth();
  const { t } = usePageTranslation();
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[] | null>(null);
  const [gameNames, setGameNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [cloning, setCloning] = useState<string | null>(null);

  // Duplicate a character into a new standalone copy (Phase 5b), then open it.
  const duplicate = async (ch: Character) => {
    const userId = user?.id;
    if (!userId) return;
    setCloning(ch.id);
    const r = await getRepositories().characters.cloneCharacter(
      ch.id,
      userId,
      t('characters.copyName', { name: ch.name })
    );
    setCloning(null);
    if (r.success) router.push(`/characters/${r.data.id}`);
    else setError(r.error?.message ?? t('characters.loadFailed'));
  };

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let active = true;
    const repos = getRepositories();
    void repos.characters.findByPlayer(userId).then(r => {
      if (!active) return;
      if (!r.success) setError(r.error?.message ?? t('characters.loadFailed'));
      else setCharacters(r.data);
    });
    void repos.games.findByPlayer(userId).then(r => {
      if (active && r.success) {
        setGameNames(Object.fromEntries(r.data.map((g: Game) => [g.id, g.name])));
      }
    });
    return () => {
      active = false;
    };
  }, [user?.id, t]);

  if (!isAuthenticated) {
    return (
      <Container maxWidth='md' padding='lg'>
        <Text variant='muted'>{t('characters.authPrompt')}</Text>
      </Container>
    );
  }

  const card = (ch: Character) => (
    <CharacterCard
      key={ch.id}
      character={ch}
      standaloneLabel={t('characters.standalone')}
      meta={t('characters.meta', {
        playbook: ch.playbookType,
        campaign: ch.gameId ? (gameNames[ch.gameId] ?? '') : t('characters.standalone'),
      })}
      actions={
        <>
          <Button
            variant='outline'
            size='sm'
            loading={cloning === ch.id}
            onClick={() => void duplicate(ch)}
          >
            {t('characters.duplicate')}
          </Button>
          <Button asChild variant='outline' size='sm'>
            <Link
              href={ch.gameId ? `/games/${ch.gameId}/characters/${ch.id}` : `/characters/${ch.id}`}
            >
              {t('characters.open')}
            </Link>
          </Button>
        </>
      }
    />
  );

  return (
    <Container maxWidth='4xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Stack direction='row' justify='between' align='center'>
          <Heading level='h1' variant='hero'>
            {t('characters.title')}
          </Heading>
          <Button asChild variant='ember'>
            <Link href='/characters/new'>{t('characters.newCharacter')}</Link>
          </Button>
        </Stack>

        {error && <ErrorDisplay title={t('characters.loadError')} message={error} />}

        {characters === null ? (
          <LoadingSpinner />
        ) : characters.length === 0 ? (
          <Card variant='outline'>
            <Stack direction='column' gap='sm' align='start'>
              <Text variant='muted'>{t('characters.empty')}</Text>
              <Button asChild variant='ember' size='sm'>
                <Link href='/characters/new'>{t('characters.createFirst')}</Link>
              </Button>
            </Stack>
          </Card>
        ) : (
          <Stack direction='column' gap='md'>
            {characters.map(card)}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
