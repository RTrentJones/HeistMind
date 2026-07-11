'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Character } from '@heist-mind/core';
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
import { SignInGate } from '@/features/auth/components/SignInGate';
import { usePageTranslation } from '@/lib/i18n/hooks';
import { CharacterCard } from '@/features/characters/components/CharacterCard';
import { useCharactersByPlayer } from '@/features/characters/data/queries';
import { useCloneCharacter } from '@/features/characters/data/mutations';
import { useGamesByPlayer } from '@/features/games/data/queries';
import { useNotificationStore } from '@/shared/stores/notification-store';
import { errorMessage } from '@/lib/query/result';

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
  const clone = useCloneCharacter();
  // Per-card spinner target: the mutation's isPending is global, the clicked card's id is not.
  const [cloning, setCloning] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

  // Duplicate a character into a new standalone copy (Phase 5b), then open it.
  const duplicate = async (ch: Character) => {
    const userId = user?.id;
    if (!userId) return;
    setCloning(ch.id);
    setCloneError(null);
    try {
      const copy = await clone.mutateAsync({
        characterId: ch.id,
        userId,
        name: t('characters.copyName', { name: ch.name }),
      });
      // F60 — say it worked; the route change alone doesn't announce the copy.
      useNotificationStore.getState().success(t('characters.duplicated', { name: copy.name }));
      router.push(`/characters/${copy.id}`);
    } catch (err) {
      setCloneError(errorMessage(err) || t('characters.loadFailed'));
    } finally {
      setCloning(null);
    }
  };

  if (!isAuthenticated) {
    return <SignInGate prompt={t('characters.authPrompt')} />;
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
