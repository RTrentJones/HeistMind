import type { NextConfig } from 'next';

/** The origin (scheme://host[:port]) of a URL-ish env value, or null when unset/unparseable. */
function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Content-Security-Policy, built from this build's own configuration so it allows exactly the
 * origins the app talks to:
 *   - Supabase (NEXT_PUBLIC_SUPABASE_URL): REST/Auth over https, Realtime over wss.
 *   - Sentry: the ingest host parsed from NEXT_PUBLIC_SENTRY_DSN (creds-guarded — absent, nothing).
 *   - Vercel's preview toolbar (vercel.live) on preview deployments (beta) only.
 *
 * script-src keeps 'unsafe-inline': the App Router's bootstrap/flight scripts are inline, and a
 * nonce would force every page to render dynamically (no static prerender). The policy's value is
 * everything else: connect-src pins where a script may send data (the Supabase session lives in
 * localStorage, so this is the main exfiltration control), plus object-src/base-uri/form-action/
 * frame-ancestors lockdown. Only applied to production builds — `next dev` needs eval for HMR.
 */
function contentSecurityPolicy(): string {
  const supabase = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseWs = supabase?.replace(/^http/, 'ws') ?? null;
  const sentry = originOf(process.env.NEXT_PUBLIC_SENTRY_DSN);
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const vercelLive = isPreview ? ['https://vercel.live'] : [];

  const directives: Record<string, Array<string | null>> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...vercelLive],
    'style-src': ["'self'", "'unsafe-inline'", ...vercelLive],
    // Discord avatars (cdn.discordapp.com) and any future remote image arrive over https.
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': [
      "'self'",
      'data:',
      ...(isPreview ? ['https://vercel.live', 'https://assets.vercel.com'] : []),
    ],
    'connect-src': [
      "'self'",
      supabase,
      supabaseWs,
      sentry,
      ...(isPreview ? ['https://vercel.live', 'wss://ws-us3.pusher.com'] : []),
    ],
    'frame-src': [...vercelLive],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };

  return Object.entries(directives)
    .map(([name, values]) => {
      const list = values.filter((v): v is string => Boolean(v));
      return list.length ? `${name} ${list.join(' ')}` : `${name} 'none'`;
    })
    .join('; ');
}

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Content-Security-Policy', value: contentSecurityPolicy() }]
    : []),
];

const nextConfig: NextConfig = {
  transpilePackages: ['@heist-mind/database', '@heist-mind/shared', '@heist-mind/ui'],
  // Expose the deployment environment to the browser so environment-aware code (the coming-soon
  // gate in lib/coming-soon.ts, indexability in lib/site.ts) resolves identically in the server,
  // middleware, and client bundles. Vercel sets VERCEL_ENV at build (production/preview/
  // development); empty locally → treated as development (gate off, noindex).
  env: { NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? '' },
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // Greenlight's verify gate reads the deployed commit at /__version (see app/api/version).
  async rewrites() {
    return [{ source: '/__version', destination: '/api/version' }];
  },
};

export default nextConfig;
