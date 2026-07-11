'use client';

import { use } from 'react';
import Link from 'next/link';
import { Button, Container, Stack } from '@heist-mind/ui';
import { SignInGate } from '@/features/auth/components/SignInGate';
import { useAuth } from '@/features/auth/stores/auth-store';
import { usePageTranslation } from '@/lib/i18n/hooks';
import { CharacterSheet } from '@/features/characters/components/CharacterSheet';

/**
 * Standalone character sheet (Phase 5 — portable characters). Same `CharacterSheet` as the
 * in-campaign view, but the character has no game: the campaign-scoped sections (active score, shared
 * roll log) hide, and the sheet offers "bring to a campaign". An in-campaign character lives at
 * `/games/[gameId]/characters/[characterId]`; this is the campaign-independent home.
 */
export default function StandaloneCharacterPage({
  params,
}: {
  params: Promise<{ characterId: string }>;
}) {
  const { characterId } = use(params);
  const { isAuthenticated } = useAuth();
  const { t } = usePageTranslation();

  if (!isAuthenticated) {
    return <SignInGate prompt={t('characters.authPrompt')} />;
  }

  return (
    <Container maxWidth='3xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Button asChild variant='ghost' size='sm'>
          <Link href='/characters'>{t('characters.backToMine')}</Link>
        </Button>
        <CharacterSheet characterId={characterId} />
      </Stack>
    </Container>
  );
}
