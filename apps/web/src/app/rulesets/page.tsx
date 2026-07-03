'use client';

import Link from 'next/link';
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
import { StarterCatalogInline } from '@/features/rulesets/components/StarterCatalogInline';
import { useRulesetsByCreator } from '@/features/rulesets/data/queries';
import { useTranslation } from '@/lib/i18n/hooks';

export default function RulesetsPage() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const rulesetsQuery = useRulesetsByCreator(user?.id);
  const rulesets = rulesetsQuery.data ?? [];
  const error = rulesetsQuery.isError
    ? (rulesetsQuery.error?.message ?? t('pages.rulesetsCatalog.loadFailed'))
    : null;

  if (!isAuthenticated) {
    return (
      <SignInGate
        heading={t('pages.rulesetsCatalog.authHeading')}
        prompt={t('pages.rulesetsCatalog.authPrompt')}
      />
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
            <StarterCatalogInline />
          </Stack>
        </Card>

        {rulesetsQuery.isLoading ? (
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
