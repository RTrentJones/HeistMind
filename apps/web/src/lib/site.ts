import type { Metadata } from 'next';

/**
 * Site identity + environment awareness for metadata, robots and the sitemap — one place that
 * answers "what is this deployment's public URL?" and "may search engines index it?".
 *
 * Environment comes from Vercel's VERCEL_ENV (`production` | `preview` | `development`). Beta
 * (beta.heistmind.rtrentjones.dev) is the `preview` target of the one Vercel project, so it is
 * NOT production here. next.config.ts maps VERCEL_ENV to NEXT_PUBLIC_VERCEL_ENV so the value is
 * inlined identically into the server, edge-middleware and client bundles; locally both are unset.
 */
const DEPLOY_ENV: string =
  process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || 'development';

const IS_PRODUCTION = DEPLOY_ENV === 'production';

/** The canonical brand origin (www is the served/primary domain; the apex 307-redirects to it). */
const CANONICAL_ORIGIN = 'https://www.heistmind.com';

/**
 * This deployment's public origin. SITE_URL is set per Vercel target by Terraform
 * (RTrentJones.dev infra/heistmind.tf: production → www.heistmind.com, preview → the beta
 * subdomain). Fallbacks: the canonical origin on production, the per-deployment Vercel URL on a
 * preview, localhost in local dev.
 */
function resolveSiteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
  if (IS_PRODUCTION) return CANONICAL_ORIGIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const SITE_URL = resolveSiteUrl();

/**
 * Only the production deployment may be indexed. Beta, previews and local builds emit
 * `noindex` (root metadata + X-Robots-Tag from middleware) and a disallow-all robots.txt.
 */
export const INDEXABLE = IS_PRODUCTION;

/**
 * True when `host` (a request Host header) is this deployment's public host. Production is also
 * reachable on non-canonical hosts (heistmind.rtrentjones.dev, *.vercel.app); those are treated as
 * non-indexable duplicates.
 */
export function isCanonicalHost(host: string | null | undefined): boolean {
  if (!host) return false;
  return host.toLowerCase() === new URL(SITE_URL).host.toLowerCase();
}

export const SITE_NAME = 'HeistMind';

export const SITE_TITLE =
  'HeistMind — rules-driven character & crew manager for Forged in the Dark';

export const SITE_DESCRIPTION =
  'Build rules-valid Blades in the Dark and Forged in the Dark scoundrels and crews, bring your sheet to any table, and run async play-by-post games on Discord with shared rolls, clocks, stress, and a campaign log.';

/** The link-preview card's dimensions + alt (rendered by lib/og-image.tsx). */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';
export const OG_ALT =
  'HeistMind — the rules-driven character & crew manager for Blades in the Dark and Forged in the Dark, with a Discord play-by-post layer';

/** The public, indexable pages — the sitemap's whole list. */
export const PUBLIC_PATHS = [
  '/',
  '/discord',
  '/legal',
  '/legal/terms',
  '/legal/privacy',
  '/legal/acceptable-use',
  '/legal/dmca',
  '/legal/licenses',
] as const;

/**
 * Metadata for a public page: its own title/description, a self-referencing canonical, and
 * matching Open Graph / Twitter text (child `openGraph`/`twitter` objects REPLACE the root's, so a
 * page that set only `title` would otherwise unfurl with the site-wide copy). Because the object is
 * replaced, the app/opengraph-image + app/twitter-image cards are re-attached explicitly too —
 * otherwise a child page that sets `openGraph` unfurls with no image.
 */
export function publicPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: (typeof PUBLIC_PATHS)[number];
}): Metadata {
  const fullTitle = `${title} · ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      type: 'website',
      images: [{ url: '/opengraph-image', ...OG_SIZE, alt: OG_ALT }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [{ url: '/twitter-image', ...OG_SIZE, alt: OG_ALT }],
    },
  };
}

/** Metadata for a signed-in app section: a title, and never indexed (robots.txt disallows too). */
export function appPageMetadata(title: string): Metadata {
  return { title, robots: { index: false, follow: false } };
}
