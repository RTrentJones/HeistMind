'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  Heading,
  LoadingSpinner,
  Section,
  Stack,
  StatusIcon,
  Text,
} from '@heist-mind/ui';
import { useAuth, useAuthPending } from '@/features/auth/stores/auth-store';
import { useSignIn } from '@/features/auth/hooks/use-sign-in';
import { useAuthTranslation } from '@/lib/i18n/hooks';
import { safeNextPath } from '@/lib/auth/next-path';

const STALL_MS = 5000;

/**
 * The no-JS landing for a sign-in button clicked BEFORE the page hydrated (round 4 P2-N2): the
 * button's form GETs here (`SignInForm`), and this page starts the same Discord OAuth once it has
 * hydrated. Already signed in → straight on to `next`. Suspense: useSearchParams must not block
 * the prerender (same shape as /auth/callback).
 */
export default function SignInPage() {
  return (
    <Suspense fallback={<SignInShell />}>
      <StartSignIn />
    </Suspense>
  );
}

function StartSignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const pending = useAuthPending();
  const { signIn, isSigningIn } = useSignIn();
  const next = safeNextPath(searchParams.get('next'));
  const started = useRef(false);
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (pending || started.current) return;
    started.current = true;
    if (isAuthenticated) {
      router.replace(next ?? '/');
      return;
    }
    void signIn(next ? { next } : undefined);
  }, [pending, isAuthenticated, next, router, signIn]);

  // On success the browser leaves for Discord within a moment; still here (a failure toast, a
  // blocked popup) → offer a manual retry.
  useEffect(() => {
    const timer = setTimeout(() => setStalled(true), STALL_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SignInShell
      retry={stalled ? () => void signIn(next ? { next } : undefined) : undefined}
      retrying={isSigningIn}
    />
  );
}

function SignInShell({ retry, retrying = false }: { retry?: () => void; retrying?: boolean }) {
  const { t } = useAuthTranslation();
  return (
    // F102 — a <main> landmark (axe landmark-one-main / region) and a 16px gutter: the card ran
    // edge to edge at 360.
    <Section as='main' variant='hero' padding='none' width='full' className='min-h-screen'>
      <Stack justify='center' align='center' className='min-h-screen px-4'>
        <Card className='w-full max-w-md'>
          <CardContent>
            <Stack gap='lg' align='center' className='text-center'>
              {/* F102 — without JavaScript the OAuth (client-side PKCE) can't start, so the
                  spinner would pulse forever: hide it and say so, with a way back. */}
              <noscript>
                <style>{'.signin-js-only{display:none!important}'}</style>
                <Stack gap='sm' align='center' data-testid='signin-noscript'>
                  <Heading level='h2' as='h1' variant='primary'>
                    {t('signin.noJsTitle')}
                  </Heading>
                  <Text variant='secondary'>{t('signin.noJs')}</Text>
                  <a href='/' className='text-sm font-medium text-brand-primary underline'>
                    {t('signin.noJsHome')}
                  </a>
                </Stack>
              </noscript>
              <div className='signin-js-only contents'>
                <StatusIcon
                  status='loading'
                  size='xl'
                  animation='pulse'
                  icon={<LoadingSpinner size='md' variant='accent' speed='normal' />}
                />
                <Stack gap='sm' align='center'>
                  <Heading level='h2' as='h1' variant='primary'>
                    {t('signin.title')}
                  </Heading>
                  <Text variant='secondary'>{t('signin.waiting')}</Text>
                </Stack>
                {retry && (
                  <Button variant='default' onClick={retry} loading={retrying}>
                    {t('signin.retry')}
                  </Button>
                )}
              </div>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Section>
  );
}
