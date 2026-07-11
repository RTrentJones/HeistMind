'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  Section,
  Stack,
  StatusIcon,
  LoadingSpinner,
  ErrorDisplay,
  Heading,
  Text,
} from '@heist-mind/ui';
import { captureError, logEvent } from '@heist-mind/telemetry';
import { useAuth } from '@/features/auth/stores/auth-store';
import { useAuthTranslation } from '@/lib/i18n/hooks';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { t } = useAuthTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for OAuth errors in URL parameters
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      captureError(new Error(`OAuth callback error: ${errorParam}`), {
        'error.surface': 'auth.callback',
        'oauth.description': errorDescription ?? undefined,
      });
      setError(errorDescription || t('callback.failed'));
      // F40 — long enough to actually read the message; home shows a retry banner on arrival.
      setTimeout(() => {
        router.push('/?error=auth_failed');
      }, 6000);
      return;
    }

    // Set a timeout for safety in case auth state change doesn't fire
    const timeout = setTimeout(() => {
      if (!isAuthenticated) {
        logEvent('auth.callback.timeout', { 'error.surface': 'auth.oauth-callback' });
        setError(t('callback.timeout'));
        setTimeout(() => {
          router.push('/?error=auth_timeout');
        }, 6000);
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(timeout);
  }, [searchParams, router, isAuthenticated, t]);

  useEffect(() => {
    // Redirect when authentication succeeds
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  return (
    <Section variant='hero' padding='none' width='full' className='min-h-screen'>
      <Stack justify='center' align='center' className='min-h-screen'>
        <Card>
          <CardContent>
            {error ? (
              <ErrorDisplay
                variant='default'
                layout='centered'
                title={t('callback.failedTitle')}
                message={error}
                size='md'
                animate
              >
                <Text size='sm' variant='muted'>
                  {t('callback.redirecting')}
                </Text>
              </ErrorDisplay>
            ) : (
              <Stack gap='lg' align='center' className='text-center'>
                <StatusIcon
                  status='loading'
                  size='xl'
                  animation='pulse'
                  icon={<LoadingSpinner size='md' variant='accent' speed='normal' />}
                />

                <Stack gap='sm' align='center'>
                  <Heading level='h2' variant='primary'>
                    {t('callback.completingTitle')}
                  </Heading>

                  <Text variant='secondary'>{t('callback.waiting')}</Text>

                  <Text size='xs' variant='muted'>
                    {t('callback.processing')}
                  </Text>
                </Stack>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Section>
  );
}
