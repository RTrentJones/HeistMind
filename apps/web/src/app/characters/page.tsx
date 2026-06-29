'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Character } from '@heist-mind/database';
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
import { useCharactersByPlayer } from '@/features/characters/data/queries';
import { useGamesByPlayer } from '@/features/games/data/queries';

/**
 * "My Characters" (Phase 5) — every character the user owns, standalone or in a campaign. The
 * campaign-independent home for character sheets; a standalone one links to `/characters/[id]`, an
 * in-campaign one to its game route.
 */
export default function MyCharactersPage() {
  const { user, isAuthenticated } = useAuth();
  const { t } = usePageTranslation();
  const router = useRouter();
  const characters = useCharactersByPlayer(user?.id);
  const games = useGamesByPlayer(user?.id);
  const gameNames = useMemo(
    () => Object.fromEntries((games.data ?? []).map(g => [g.id, g.name])),
    [games.data]
  );
  const [cloning, setCloning] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

  // Duplicate a character into a new standalone copy (Phase 5b), then open it. (Write → PR4b mutation.)
  const duplicate = async (ch: Character) => {
    const userId = user?.id;
    if (!userId) return;
    setCloning(ch.id);
    setCloneError(null);
    const r = await getRepositories().characters.cloneCharacter(
      ch.id,
      userId,
      t('characters.copyName', { name: ch.name })
    );
    setCloning(null);
    if (r.success) router.push(`/characters/${r.data.id}`);
    else setCloneError(r.error?.message ?? t('characters.loadFailed'));
  };

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

        {(characters.isError || cloneError) && (
          <ErrorDisplay
            title={t('characters.loadError')}
            message={cloneError ?? (characters.error as Error)?.message ?? ''}
          />
        )}

        {characters.isLoading ? (
          <LoadingSpinner />
        ) : !characters.data || characters.data.length === 0 ? (
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
            {characters.data.map(card)}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
