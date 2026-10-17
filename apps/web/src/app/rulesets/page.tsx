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
import { rulesetDeleteBlocked, useDeleteRuleset } from '@/features/rulesets/data/mutations';
import { errorMessage } from '@/lib/query/result';
import { ConfirmButton } from '@/shared/components/ConfirmButton';
import { useNotificationStore } from '@/shared/stores/notification-store';
import { useTranslation } from '@/lib/i18n/hooks';

export default function RulesetsPage() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const rulesetsQuery = useRulesetsByCreator(user?.id);
  const rulesets = rulesetsQuery.data ?? [];
  const del = useDeleteRuleset();
  // F94 — delete a ruleset you own; the database refuses while a campaign or character uses it,
  // and we say exactly that (not a raw foreign-key error).
  const remove = (id: string, name: string) =>
    del.mutate(
      { rulesetId: id },
      {
        onSuccess: () =>
          useNotificationStore.getState().success(t('pages.rulesetsCatalog.deleted', { name })),
        onError: err =>
          useNotificationStore
            .getState()
            .error(
              t('pages.rulesetsCatalog.deleteFailed', { name }),
              rulesetDeleteBlocked(err)
                ? t('pages.rulesetsCatalog.deleteBlocked')
                : errorMessage(err) || undefined
            ),
      }
    );
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
        <Stack direction='row' justify='between' align='center' className='flex-wrap gap-2'>
          <Heading level='h1' variant='hero'>
            {t('pages.rulesetsCatalog.title')}
          </Heading>
          <Button asChild variant='ember'>
            <Link href='/rulesets/new'>{t('pages.rulesetsCatalog.uploadCta')}</Link>
          </Button>
        </Stack>

        {error && (
          <ErrorDisplay
            title={t('pages.rulesetsCatalog.loadError')}
            message={error}
            onRetry={() => void rulesetsQuery.refetch()}
            retryText={t('components.asyncState.retry')}
          />
        )}

        {/* Built-in catalog — load any system with one click (adds a copy you own). */}
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

        <Heading level='h2'>{t('pages.rulesetsCatalog.yourRulesets')}</Heading>
        {rulesetsQuery.isLoading ? (
          <LoadingSpinner />
        ) : rulesetsQuery.isError ? null : rulesets.length === 0 ? (
          <Text variant='muted'>{t('pages.rulesetsCatalog.empty')}</Text>
        ) : (
          <Stack direction='column' gap='md'>
            {rulesets.map(rs => (
              <Card key={rs.id} variant='outline'>
                {/* Wraps at 360px instead of pushing the CTA off-screen (review item 9). */}
                <Stack direction='row' justify='between' align='center' className='flex-wrap gap-2'>
                  <div className='min-w-0'>
                    <Heading level='h3' className='break-words'>
                      {rs.name}
                    </Heading>
                    <Text variant='muted' size='sm'>
                      {t('pages.rulesetsCatalog.versionPrefix')}
                      {rs.version}
                      {rs.content?.metadata?.system ? ` · ${rs.content.metadata.system}` : ''}
                    </Text>
                  </div>
                  <Stack direction='row' gap='sm' align='center' className='flex-wrap'>
                    <Button asChild variant='outline' size='sm'>
                      <Link href={`/games/new?ruleset=${rs.id}`}>
                        {t('pages.rulesetsCatalog.createGame')}
                      </Link>
                    </Button>
                    <ConfirmButton
                      size='sm'
                      variant='ghost'
                      confirmLabel={t('pages.rulesetsCatalog.confirmDelete')}
                      aria-label={t('pages.rulesetsCatalog.deleteAria', { name: rs.name })}
                      confirmAriaLabel={t('pages.rulesetsCatalog.confirmDeleteAria', {
                        name: rs.name,
                      })}
                      loading={del.isPending && del.variables?.rulesetId === rs.id}
                      onConfirm={() => remove(rs.id, rs.name)}
                    >
                      {t('pages.rulesetsCatalog.delete')}
                    </ConfirmButton>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
