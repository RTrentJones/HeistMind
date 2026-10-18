'use client';

import { usePathname } from 'next/navigation';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { Footer } from '@/shared/components/Footer';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * The signed-in page chrome: skip-to-main link (F41), the persistent header, breadcrumb wayfinding
 * (F22; renders nothing on a top-level route), the `<main>` landmark and the footer.
 *
 * Layout (F93): a full-viewport flex column so the footer sits at the bottom of short pages (404,
 * gates) instead of floating mid-screen, and one consistent gap under the header (the page h1 used
 * to sit ~8px under the header rule). Shared by `AppShell` (every inner route) and the signed-in
 * dashboard at `/` (F95 — it used to hand-roll its own wrapper and missed both).
 */
export function PageShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
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
      <main id='main-content' className='flex-1 pt-6 sm:pt-10'>
        {children}
      </main>
      <Footer />
    </div>
  );
}

/**
 * App shell for the authenticated surface. The landing (`/` — marketing when signed out, the
 * dashboard when signed in, which renders `PageShell` itself) and the transient auth callback
 * (`/auth/*`) own their own layouts, so the shell steps aside there.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/' || pathname.startsWith('/auth')) return <>{children}</>;
  return <PageShell>{children}</PageShell>;
}
