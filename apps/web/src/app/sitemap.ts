import type { MetadataRoute } from 'next';
import { COMING_SOON, isComingSoonAllowed } from '@/lib/coming-soon';
import { INDEXABLE, PUBLIC_PATHS, SITE_URL } from '@/lib/site';

/**
 * /sitemap.xml — the public pages only (never the signed-in app). Empty on non-indexable
 * deployments (beta, previews, local). While the prod coming-soon gate is up, only the pages the
 * gate still serves are listed (everything else redirects to `/`).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!INDEXABLE) return [];

  return PUBLIC_PATHS.filter(path => !COMING_SOON || isComingSoonAllowed(path)).map(path => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path === '/discord' ? 0.8 : 0.3,
  }));
}
