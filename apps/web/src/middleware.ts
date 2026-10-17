import { NextResponse, type NextRequest } from 'next/server';
import { COMING_SOON, isComingSoonAllowed } from '@/lib/coming-soon';
import { INDEXABLE, isCanonicalHost } from '@/lib/site';

/**
 * The prod holding-page gate (see lib/coming-soon.ts). While it is on — by default on the Vercel
 * production deployment, overridable either way with `NEXT_PUBLIC_COMING_SOON` — every app route
 * except the holding page and the public legal pages redirects to `/`. That is what disables
 * sign-in on prod: there's no route into the authenticated app, and `/auth/callback` itself
 * redirects home. Off on beta (a Vercel preview) / local / CI unless the flag forces it on.
 *
 * It also stamps `X-Robots-Tag: noindex` on every page response that must stay out of search
 * results: any non-production deployment (beta, previews, local) and production reached on a
 * non-canonical host (heistmind.rtrentjones.dev, *.vercel.app). The root metadata carries the same
 * noindex for non-production builds; the header additionally covers the host case, which static
 * HTML can't know about.
 *
 * The matcher excludes `/api/*`, Next's static assets, and the public metadata/static files
 * (favicon, app icons, OG/Twitter images, robots/sitemap, the webmanifest and anything else with a
 * file extension), so the Discord interactions endpoint, the account-delete route, link previews
 * and icons keep working at the HTTP level even while the gate is up — this gates the web UI, not
 * the API or asset surface.
 */
export function middleware(request: NextRequest): NextResponse {
  let response: NextResponse;
  if (COMING_SOON && !isComingSoonAllowed(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    response = NextResponse.redirect(url);
  } else {
    response = NextResponse.next();
  }

  if (!INDEXABLE || !isCanonicalHost(request.headers.get('host'))) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|opengraph-image|twitter-image|icon|apple-icon|.*\\.[a-z0-9]+$).*)',
  ],
};
