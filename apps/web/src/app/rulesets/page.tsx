'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Ruleset } from '@heist-mind/database';
import { BUILTIN_RULESETS } from '@heist-mind/shared';
import {
  Badge,
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
import { LoadBuiltinRulesetButton } from '@/features/rulesets/components/LoadBuiltinRulesetButton';
import { useTranslation } from '@/lib/i18n/hooks';

export default function RulesetsPage() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [rulesets, setRulesets] = useState<Ruleset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRulesets = useCallback(() => {
    const userId = user?.id;
    if (!userId) return;
    setError(null);
    getRepositories()
      .rulesets.findByCreator(userId)
      .then(result => {
        if (!result.success)
          setError(result.error?.message ?? t('pages.rulesetsCatalog.loadFailed'));
        else setRulesets(result.data);
      });
  }, [user?.id, t]);

  useEffect(() => {
    loadRulesets();
  }, [loadRulesets]);

  if (!isAuthenticated) {
    return (
      <Container maxWidth='md' padding='lg'>
        <Text variant='muted'>{t('pages.rulesetsCatalog.authPrompt')}</Text>
      </Container>
    );
  }

  return (
    <Container maxWidth='4xl' padding='lg'>
      <Stack direction='column' gap='lg'>
        <Stack direction='row' justify='between' align='center'>
          <Heading level='h1' variant='hero'>
            {t('pages.rulesetsCatalog.title')}
          </Heading>
          <Button asChild variant='ember'>
            <Link href='/rulesets/new'>{t('pages.rulesetsCatalog.uploadCta')}</Link>
          </Button>
        </Stack>

        {error && <ErrorDisplay title={t('pages.rulesetsCatalog.loadError')} message={error} />}

        {/* Built-in catalog — load any system with one click (creates an editable copy you own). */}
        <Card variant='outline'>
          <Stack direction='column' gap='sm'>
            <div>
              <Heading level='h2'>{t('pages.rulesetsCatalog.starterHeading')}</Heading>
              <Text variant='muted' size='sm'>
                {t('pages.rulesetsCatalog.starterDescription')}
              </Text>
            </div>
            <Stack direction='column' gap='sm'>
              {BUILTIN_RULESETS.map(b => (
                <Card key={b.id} variant='default'>
                  <Stack
                    direction='row'
                    justify='between'
                    align='center'
                    className='flex-wrap gap-2'
                  >
                    <div className='min-w-0'>
                      <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
                        <Heading level='h3'>{b.content.metadata.name}</Heading>
                        <Badge variant={b.tier === 'starter' ? 'gold' : 'steel'}>{b.tier}</Badge>
                        {b.license && <Badge variant='steel'>{b.license}</Badge>}
                      </Stack>
                      {b.blurb && (
                        <Text variant='muted' size='sm'>
                          {b.blurb}
                        </Text>
                      )}
                      {b.attribution && (
                        <Text variant='muted' size='sm' className='mt-1 italic'>
                          {b.attribution}
                        </Text>
                      )}
                    </div>
                    <LoadBuiltinRulesetButton
                      builtin={b}
                      variant='outline'
                      onLoaded={loadRulesets}
                    />
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Stack>
        </Card>

        {rulesets === null ? (
          <LoadingSpinner />
        ) : rulesets.length === 0 ? (
          <Text variant='muted'>{t('pages.rulesetsCatalog.empty')}</Text>
        ) : (
          <Stack direction='column' gap='md'>
            {rulesets.map(rs => (
              <Card key={rs.id} variant='outline'>
                <Stack direction='row' justify='between' align='center'>
                  <div>
                    <Heading level='h3'>{rs.name}</Heading>
                    <Text variant='muted' size='sm'>
                      {t('pages.rulesetsCatalog.versionPrefix')}
                      {rs.version}
                      {rs.content?.metadata?.system ? ` · ${rs.content.metadata.system}` : ''}
                    </Text>
                  </div>
                  <Button asChild variant='outline' size='sm'>
                    <Link href={`/games/new?ruleset=${rs.id}`}>
                      {t('pages.rulesetsCatalog.createGame')}
                    </Link>
                  </Button>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
