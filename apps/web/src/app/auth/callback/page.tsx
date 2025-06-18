'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container, Card, CardContent } from '@heist-mind/ui';
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
    <div className='min-h-screen bg-neutral-950'>
      <Container className='flex items-center justify-center min-h-screen'>
        <Card>
          <CardContent className='text-center space-y-4 p-8'>
            {error ? (
              <>
                <div className='w-12 h-12 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center mx-auto'>
                  <span className='text-red-400 text-xl'>✕</span>
                </div>
                <div className='space-y-2'>
                  <h2 className='text-lg font-semibold text-red-400'>Authentication Failed</h2>
                  <p className='text-neutral-400'>{error}</p>
                  <p className='text-neutral-500 text-sm'>Redirecting you back...</p>
                </div>
              </>
            ) : (
              <>
                <div className='w-12 h-12 rounded-full bg-orange-500/20 border border-orange-400 flex items-center justify-center mx-auto'>
                  <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-orange-400'></div>
                </div>
                <div className='space-y-2'>
                  <h2 className='text-lg font-semibold text-white'>Completing Sign In</h2>
                  <p className='text-neutral-400'>
                    Waiting for Discord authentication to complete...
                  </p>
                  <p className='text-neutral-500 text-xs'>
                    Supabase is processing your OAuth tokens automatically
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
