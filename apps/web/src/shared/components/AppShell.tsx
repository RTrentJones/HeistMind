'use client';

import { usePathname } from 'next/navigation';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { Footer } from '@/shared/components/Footer';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * App shell for the authenticated surface: a persistent header (the inner pages previously had no
 * nav chrome at all), breadcrumb wayfinding (F22), a skip-to-main link (F41), and the `<main>`
 * landmark. The marketing landing (`/`) and the transient auth callback (`/auth/*`) own their own
 * full-screen layouts and headers, so the shell steps aside there.
 *
 * Layout (F93): a full-viewport flex column so the footer never floats mid-screen on short pages
 * (404, gates), and one consistent gap under the header (the page h1 used to sit ~8px under the
 * header rule). UX r3: `main` is at least a viewport tall, so the footer sits just below the fold
 * and loading → content swaps don't move it (layout shift).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  if (pathname === '/' || pathname.startsWith('/auth')) return <>{children}</>;

  return (
    <div className='flex min-h-dvh flex-col'>
      <a
        href='#main-content'
        className='sr-only rounded bg-background-secondary px-4 py-2 text-foreground-primary focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60]'
      >
        {t('navigation.skipToMain')}
      </a>
      <AuthHeader />
      <Breadcrumbs />
      {/* UX r3 (CLS): main is at least a viewport tall, so the footer starts just below the fold.
          Pages pass through short states (auth check → spinner → content) and every swap used to
          drag a mid-screen footer up and down (sheet/hub/post-join CLS 0.2–1.0). */}
      <main id='main-content' className='min-h-[calc(100dvh-4rem)] flex-1 pt-6 sm:pt-10'>
        {children}
      </main>
      <Footer />
    </div>
  );
}
