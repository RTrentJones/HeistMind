'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Ruleset } from '@heist-mind/core';
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
import { SignInGate } from '@/features/auth/components/SignInGate';
import { useAuth } from '@/features/auth/stores/auth-store';
import { StarterCatalogInline } from '@/features/rulesets/components/StarterCatalogInline';
import { useRulesetsByCreator } from '@/features/rulesets/data/queries';
import { usePageTranslation } from '@/lib/i18n/hooks';
import { CharacterCreationWizard } from '@/features/characters/components/CharacterCreationWizard';

/**
 * Standalone character creation (Phase 5). Pick one of your rulesets — or grab a built-in with one
 * click (the inline starter catalog, F37: a brand-new user builds a character with NO /rulesets
 * detour) — then the same creation wizard runs with no campaign; the new character lands in
 * "My Characters" and can be brought to a table later. (To create directly inside a campaign, use
 * the game's "Create character".)
 */
export default function NewStandaloneCharacterPage() {
  const { user, isAuthenticated } = useAuth();
  const { t } = usePageTranslation();
  const router = useRouter();
  const rulesets = useRulesetsByCreator(user?.id);
  const [picked, setPicked] = useState<Ruleset | null>(null);

  if (!isAuthenticated) {
    return <SignInGate heading={t('characters.newTitle')} prompt={t('characters.authPrompt')} />;
  }

  // Ruleset chosen → run the wizard standalone (no gameId); land on the new standalone sheet.
  if (picked) {
    return (
      <Container maxWidth='4xl' padding='lg'>
        <CharacterCreationWizard
          ruleset={picked}
          onComplete={id => router.push(`/characters/${id}`)}
          onCancel={() => setPicked(null)}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth='3xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Stack direction='column' gap='xs'>
          <Heading level='h1' variant='hero'>
            {t('characters.newTitle')}
          </Heading>
          <Text variant='muted'>{t('characters.pickRuleset')}</Text>
        </Stack>

        {rulesets.isError && (
          <ErrorDisplay
            title={t('characters.loadError')}
            message={rulesets.error?.message ?? t('characters.loadFailed')}
          />
        )}

        {rulesets.isLoading ? (
          <LoadingSpinner />
        ) : !rulesets.data || rulesets.data.length === 0 ? (
          // No rulesets yet — the flagship first-run path: one click on a built-in continues
          // STRAIGHT into the wizard (no /rulesets detour).
          <Stack direction='column' gap='sm'>
            <Text variant='muted'>{t('characters.startWithBuiltin')}</Text>
            <StarterCatalogInline onLoaded={setPicked} />
            <Text variant='muted' size='sm'>
              {t('characters.orUpload')}{' '}
              <Link href='/rulesets/new' className='underline'>
                {t('characters.uploadLink')}
              </Link>
            </Text>
          </Stack>
        ) : (
          <Stack direction='column' gap='md'>
            {rulesets.data.map(rs => (
              <Card key={rs.id} variant='outline'>
                <Stack direction='row' justify='between' align='center' className='flex-wrap'>
                  <div>
                    <Heading level='h3'>{rs.name}</Heading>
                    <Text variant='muted' size='sm'>
                      {t('characters.rulesetVersion', { version: rs.version })}
                    </Text>
                  </div>
                  <Button variant='ember' size='sm' onClick={() => setPicked(rs)}>
                    {t('characters.build')}
                  </Button>
                </Stack>
              </Card>
            ))}
            {/* The catalog stays reachable with rulesets present too — grab another system and
                continue straight into the wizard. */}
            <Stack direction='column' gap='sm'>
              <Heading level='h3'>{t('characters.moreSystems')}</Heading>
              <StarterCatalogInline onLoaded={setPicked} />
            </Stack>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
