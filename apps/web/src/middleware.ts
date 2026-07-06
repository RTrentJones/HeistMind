import { NextResponse, type NextRequest } from 'next/server';
import { COMING_SOON, isComingSoonAllowed } from '@/lib/coming-soon';

/**
 * The prod holding-page gate (see lib/coming-soon.ts). When `NEXT_PUBLIC_COMING_SOON=1` (Vercel
 * prod only), every app route except the holding page and the public legal pages redirects to
 * `/` — which is what disables sign-in on prod: there's no route into the authenticated app, and
 * `/auth/callback` itself redirects home. Off by default, so beta / preview / local are untouched.
 *
 * The matcher excludes `/api/*` and static assets, so the Discord interactions endpoint, the
 * account-delete route, and page/asset serving keep working at the HTTP level — this gates the
 * web UI, not the API surface.
 */
export function middleware(request: NextRequest): NextResponse {
  if (!COMING_SOON) return NextResponse.next();

  if (isComingSoonAllowed(request.nextUrl.pathname)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
