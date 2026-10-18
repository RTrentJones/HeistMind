'use client';

import type { ReactNode } from 'react';
import { ErrorDisplay, Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * The shared loading / error-with-retry building blocks for async surfaces (review items 6/7):
 * every query-backed panel renders exactly one of loading → error (with a retry wired to the
 * query's `refetch`) → empty → content, so a failure never masquerades as an empty state and an
 * in-flight load never flashes the empty copy.
 */
export function QueryLoading({ label, testId }: { label?: string; testId?: string }) {
  const { t } = useTranslation();
  return (
    <Text variant='muted' size='sm' role='status' aria-live='polite' data-testid={testId}>
      {label ?? t('components.asyncState.loading')}
    </Text>
  );
}

export function QueryError({
  title,
  message,
  onRetry,
  children,
  testId,
}: {
  title: string;
  message?: string | null;
  /** Wire to the failed query's `refetch` — omit only when there is genuinely nothing to retry. */
  onRetry?: () => void;
  /** Extra recovery actions (e.g. a link back to a safe page). */
  children?: ReactNode;
  testId?: string;
}) {
  const { t } = useTranslation();
  return (
    <ErrorDisplay
      size='sm'
      title={title}
      message={message ?? undefined}
      {...(onRetry ? { onRetry, retryText: t('components.asyncState.retry') } : {})}
      data-testid={testId}
    >
      {children}
    </ErrorDisplay>
  );
}
