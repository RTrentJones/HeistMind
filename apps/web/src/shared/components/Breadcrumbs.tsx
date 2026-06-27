'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Path-derived breadcrumb trail for deep app routes (F22 wayfinding — inner pages otherwise had no
 * way back but the browser button). Parent crumbs are links; the current page is plain text. Raw id
 * segments are relabelled to their kind ("Campaign", "Character") since names aren't resolved here.
 * Renders nothing on shallow routes (a single crumb adds no wayfinding over the page title).
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const segs = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let href = '';
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    href += `/${seg}`;
    const prev = segs[i - 1];
    let label: string | null = null;
    if (seg === 'games') label = t('navigation.campaigns');
    else if (seg === 'rulesets') label = t('navigation.rulesets');
    else if (seg === 'characters')
      label = null; // path-only segment; the next crumb is the character
    else if (seg === 'new')
      label =
        prev === 'characters'
          ? t('navigation.newCharacter')
          : prev === 'rulesets'
            ? t('navigation.uploadRuleset')
            : t('navigation.newCampaign');
    else if (prev === 'games') label = t('navigation.campaign');
    else if (prev === 'characters') label = t('navigation.character');
    if (label) crumbs.push({ label, href });
  }

  if (crumbs.length < 2) return null;

  return (
    <nav
      aria-label={t('navigation.breadcrumbLabel')}
      className='mx-auto w-full max-w-4xl px-4 pt-4 sm:px-6 lg:px-8'
    >
      <ol className='flex flex-wrap items-center gap-1.5 text-sm text-foreground-muted'>
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={c.href} className='flex items-center gap-1.5'>
              {i > 0 && <span aria-hidden='true'>/</span>}
              {isLast ? (
                <span aria-current='page' className='text-foreground-secondary'>
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className='hover:text-foreground-primary hover:underline'>
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
