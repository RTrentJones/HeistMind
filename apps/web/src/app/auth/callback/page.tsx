'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
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
import { useAuth } from '@/features/auth/stores/auth-store';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for OAuth errors in URL parameters
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      console.error('OAuth error from URL:', errorParam, errorDescription);
      setError(errorDescription || 'Authentication failed. Please try again.');
      setTimeout(() => {
        router.push('/?error=auth_failed');
      }, 2000);
      return;
    }

    // Set a timeout for safety in case auth state change doesn't fire
    const timeout = setTimeout(() => {
      if (!isAuthenticated) {
        console.warn('OAuth callback timeout - auth state did not change');
        setError('Authentication timeout. Please try again.');
        setTimeout(() => {
          router.push('/?error=auth_timeout');
        }, 2000);
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(timeout);
  }, [searchParams, router, isAuthenticated]);

  useEffect(() => {
    // Redirect when authentication succeeds
    if (isAuthenticated) {
      console.log('OAuth success - redirecting to home');
      router.push('/');
    }
  }, [isAuthenticated, router]);

  return (
    <Section variant='hero' padding='none' width='full' className='min-h-screen'>
      <Container className='flex items-center justify-center min-h-screen'>
        <Card>
          <CardContent className='p-8'>
            {error ? (
              <ErrorDisplay
                variant='default'
                layout='centered'
                title='Authentication Failed'
                message={error}
                size='md'
                animate
              >
                <Text size='sm' variant='muted'>
                  Redirecting you back...
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
                    Completing Sign In
                  </Heading>

                  <Text variant='secondary'>Waiting for Discord authentication to complete...</Text>

                  <Text size='xs' variant='muted'>
                    Supabase is processing your OAuth tokens automatically
                  </Text>
                </Stack>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Container>
    </Section>
  );
}
