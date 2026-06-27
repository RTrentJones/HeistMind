'use client';

import { usePathname } from 'next/navigation';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * App shell for the authenticated surface: a persistent header (the inner pages previously had no
 * nav chrome at all), breadcrumb wayfinding (F22), a skip-to-main link (F41), and the `<main>`
 * landmark. The marketing landing (`/`) and the transient auth callback (`/auth/*`) own their own
 * full-screen layouts and headers, so the shell steps aside there.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  if (pathname === '/' || pathname.startsWith('/auth')) return <>{children}</>;

  return (
    <>
      <a
        href='#main-content'
        className='sr-only rounded bg-background-secondary px-4 py-2 text-foreground-primary focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50'
      >
        {t('navigation.skipToMain')}
      </a>
      <AuthHeader />
      <Breadcrumbs />
      <main id='main-content'>{children}</main>
    </>
  );
}
