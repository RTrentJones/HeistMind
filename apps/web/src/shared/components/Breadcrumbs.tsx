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
/**
 * The trail sits in the SAME column as the page below it (F93: it used a fixed max-w-4xl while
 * most deep pages are 3xl, so crumbs started ~80px left of the content at desktop widths). The
 * classes mirror each route's `<Container maxWidth=… padding='lg'>` (and the wizard's own 900px
 * column, which has no Container).
 */
const COLUMN_3XL = 'max-w-3xl px-8 lg:px-12';
const COLUMN_4XL = 'max-w-4xl px-8 lg:px-12';
const COLUMN_WIZARD = 'max-w-[900px] px-[clamp(20px,4vw,32px)]';

export function crumbColumn(pathname: string): string {
  if (/^\/games\/[^/]+\/characters\/new$/.test(pathname)) return COLUMN_WIZARD;
  if (/^\/games\/[^/]+$/.test(pathname) && pathname !== '/games/new') return COLUMN_4XL;
  return COLUMN_3XL;
}

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
      className={`mx-auto w-full pt-4 ${crumbColumn(pathname)}`}
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
