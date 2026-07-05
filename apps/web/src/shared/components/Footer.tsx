'use client';

import Link from 'next/link';
import { Text } from '@heist-mind/ui';
import { useTranslation } from '@/lib/i18n/hooks';

const LEGAL_LINKS = [
  { href: '/legal/terms', key: 'navigation.footer.terms' },
  { href: '/legal/privacy', key: 'navigation.footer.privacy' },
  { href: '/legal/dmca', key: 'navigation.footer.dmca' },
  { href: '/legal/acceptable-use', key: 'navigation.footer.acceptableUse' },
  { href: '/legal/licenses', key: 'navigation.footer.licenses' },
] as const;

/**
 * The site-wide legal footer. Mounted three times because the shell steps aside on `/`:
 * `AppShell` (all inner routes), `HomePage` (signed-out `/`), and `Dashboard` (signed-in `/`).
 */
export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className='mt-12 border-t border-border-primary px-4 py-6 sm:px-6 lg:px-8'>
      <div className='mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-2'>
        {LEGAL_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className='text-sm text-foreground-muted underline-offset-2 hover:underline'
          >
            {t(link.key)}
          </Link>
        ))}
        <Text variant='muted' size='sm'>
          {t('navigation.footer.copyright', { year })}
        </Text>
      </div>
    </footer>
  );
}
