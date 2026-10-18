import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { INDEXABLE, isCanonicalHost, SITE_URL } from '@/lib/site';

/**
 * /robots.txt. Production on its canonical host: crawl the public pages, skip the signed-in app
 * and the API, and point at the sitemap. Everything else — beta (a Vercel preview), previews,
 * local, and production reached on a non-canonical host (heistmind.rtrentjones.dev,
 * *.vercel.app) — disallows everything. Reads the Host header, so it renders per request.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host');

  if (!INDEXABLE || !isCanonicalHost(host)) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/', '/join/', '/games', '/characters', '/rulesets', '/settings'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
