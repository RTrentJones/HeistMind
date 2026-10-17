'use client';

import { LoadingSpinner, Stack, Text } from '@heist-mind/ui';
import { QueryError } from './QueryStates';

/**
 * The list-state scaffold every resource page hand-rolled before (round-1 C11): spinner while
 * loading, error banner on failure, muted empty text, otherwise the caller's list. Query-agnostic —
 * pass the RQ flags; the caller keeps full control of the list markup itself.
 */
export function ResourceList({
  isLoading,
  isError,
  errorTitle,
  errorText,
  isEmpty,
  emptyContent,
  onRetry,
  children,
}: {
  isLoading: boolean;
  isError?: boolean;
  errorTitle?: string;
  errorText?: string | null;
  isEmpty: boolean;
  emptyContent: React.ReactNode;
  /** Refetch the failed query(ies) — rendered as the error state's retry action. */
  onRetry?: () => void;
  children: React.ReactNode;
}) {
  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return <QueryError title={errorTitle ?? ''} message={errorText} onRetry={onRetry} />;
  }
  if (isEmpty) {
    return typeof emptyContent === 'string' ? (
      <Text variant='muted'>{emptyContent}</Text>
    ) : (
      <>{emptyContent}</>
    );
  }
  return (
    <Stack direction='column' gap='md'>
      {children}
    </Stack>
  );
}
