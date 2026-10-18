'use client';

import { Container, Stack } from '@heist-mind/ui';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { useAuth, useAuthPending } from '@/features/auth/stores/auth-store';
import { Dashboard } from '@/features/dashboard/components/Dashboard';
import { useTranslation } from '@/lib/i18n/hooks';

/** A neutral stand-in for the dashboard while a likely-signed-in visitor's session resolves. */
function HomeSkeleton() {
  const { t } = useTranslation();
  const bar = 'rounded-md bg-background-tertiary motion-safe:animate-pulse';
  return (
    <div className='flex min-h-dvh flex-col' data-testid='home-skeleton'>
      <AuthHeader />
      <main className='flex-1' aria-busy='true'>
        <Container maxWidth='4xl' padding='lg'>
          <span className='sr-only' role='status'>
            {t('components.asyncState.loading')}
          </span>
          <Stack direction='column' gap='lg' aria-hidden='true'>
            <Stack direction='column' gap='sm'>
              <div className={`${bar} h-12 w-3/4 sm:h-16`} />
              <div className={`${bar} h-5 w-1/2`} />
            </Stack>
            <div className='flex flex-wrap gap-2'>
              <div className={`${bar} h-11 w-36`} />
              <div className={`${bar} h-11 w-36`} />
              <div className={`${bar} h-11 w-32`} />
            </div>
            <div className={`${bar} h-40 w-full`} />
            <div className={`${bar} h-40 w-full`} />
          </Stack>
        </Container>
      </main>
    </div>
  );
}

/**
 * The `/` front door for both audiences: the server-rendered marketing sections (passed down from
 * the server `page.tsx`) for visitors, the personal Dashboard once authenticated (the OAuth
 * callback redirects here). Auth lives in the browser (Supabase session + persisted store), so the
 * swap necessarily happens client-side; the marketing HTML is what crawlers and first paints see.
 *
 * F101 — no signed-out flash for a returning user: the server HTML carries BOTH the marketing
 * (`data-auth-only=out`) and a hidden skeleton (`data-auth-only=in`); the pre-hydration hint script
 * picks which one paints (lib/auth-hint.ts). After hydration the store decides: the Dashboard when
 * signed in, the skeleton while a likely-signed-in session is still being checked, else marketing.
 * The marketing wrapper is `display: contents` and stays in the same tree position, so its DOM
 * isn't remounted when the skeleton sibling drops away.
 */
export function HomeSwitch({ marketing }: { marketing: React.ReactNode }) {
  const { isAuthenticated, hasHydrated } = useAuth();
  const pending = useAuthPending();

  if (isAuthenticated) return <Dashboard />;
  if (hasHydrated && pending) return <HomeSkeleton />;
  return (
    <>
      <div className='contents' data-auth-only='out'>
        {marketing}
      </div>
      {!hasHydrated && (
        <div className='contents' data-auth-only='in'>
          <HomeSkeleton />
        </div>
      )}
    </>
  );
}
