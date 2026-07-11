'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, Container } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Surfaces `?error=auth_failed|auth_timeout` on the landing page (F40) — the OAuth callback
 * redirects here on failure, and the marker used to land with no UI at all. Dismissible; the
 * header's sign-in buttons are the retry path. Must sit inside a <Suspense> (useSearchParams
 * on a prerendered route).
 */
export function AuthErrorBanner() {
  const { t } = useTranslation();
  const error = useSearchParams().get('error');
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || (error !== 'auth_failed' && error !== 'auth_timeout')) return null;
  return (
    <Container maxWidth='3xl' padding='md'>
      <Alert variant='destructive' dismissible onDismiss={() => setDismissed(true)}>
        {error === 'auth_timeout' ? t('auth.banner.authTimeout') : t('auth.banner.authFailed')}
      </Alert>
    </Container>
  );
}
