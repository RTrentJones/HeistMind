'use client';

import { use } from 'react';
import Link from 'next/link';
import { Button, Container, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { CharacterSheet } from '@/features/characters/components/CharacterSheet';
import { usePageTranslation } from '@/lib/i18n/hooks';

export default function CharacterPage({
  params,
}: {
  params: Promise<{ gameId: string; characterId: string }>;
}) {
  const { gameId, characterId } = use(params);
  const { isAuthenticated } = useAuth();
  const { t } = usePageTranslation();

  return (
    <Container maxWidth='3xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Button asChild variant='ghost' size='sm'>
          <Link href={`/games/${gameId}`}>{t('game.backToCampaign')}</Link>
        </Button>
        {isAuthenticated ? (
          <CharacterSheet characterId={characterId} />
        ) : (
          <Text variant='muted'>{t('game.characterAuthPrompt')}</Text>
        )}
      </Stack>
    </Container>
  );
}
