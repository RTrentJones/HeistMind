'use client';

import { use } from 'react';
import Link from 'next/link';
import { Button, Container, Stack, Text } from '@heist-mind/ui';
import { useAuth } from '@/features/auth/stores/auth-store';
import { CharacterSheet } from '@/features/characters/components/CharacterSheet';

export default function CharacterPage({
  params,
}: {
  params: Promise<{ gameId: string; characterId: string }>;
}) {
  const { gameId, characterId } = use(params);
  const { isAuthenticated } = useAuth();

  return (
    <Container maxWidth='3xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Button asChild variant='ghost' size='sm'>
          <Link href={`/games/${gameId}`}>← Back to campaign</Link>
        </Button>
        {isAuthenticated ? (
          <CharacterSheet characterId={characterId} />
        ) : (
          <Text variant='muted'>Please sign in to view this character.</Text>
        )}
      </Stack>
    </Container>
  );
}
