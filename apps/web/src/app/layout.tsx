import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Cinzel, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AppShell } from '@/shared/components/AppShell';
import { INDEXABLE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/site';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Display fonts for the heist identity. The design system's `.font-display` token references the
// Cinzel / Playfair Display families; the web app self-hosts them here (next/font) and maps the
// token to these CSS vars in globals.css, so headings render in-brand instead of the serif fallback.
const cinzel = Cinzel({
  variable: '--font-cinzel',
  subsets: ['latin'],
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
});

// Favicons/app icons come from the App Router magic files (app/favicon.ico, app/icon.svg,
// app/apple-icon.png) and the link-preview image from app/opengraph-image.tsx +
// app/twitter-image.tsx — Next emits those tags automatically. Here: the site-wide defaults.
//
// metadataBase is this deployment's own origin (lib/site.ts: SITE_URL per Vercel target), so
// relative OG/canonical URLs resolve on the env they're served from. There is deliberately NO root
// canonical: a root `alternates.canonical` is inherited by every page, which pointed /discord and
// the legal pages at the homepage. Public pages set their own (lib/site.ts publicPageMetadata).
// Non-production deployments (beta, previews, local) are noindex — see lib/site.ts INDEXABLE.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: '%s · HeistMind' },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: '/site.webmanifest',
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESCRIPTION },
  ...(!INDEXABLE && { robots: { index: false, follow: false } }),
};

// themeColor lives on the viewport export in Next 15 (matches the bundle's #0B0F19).
export const viewport: Viewport = {
  themeColor: '#0B0F19',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} ${playfairDisplay.variable} antialiased`}
      >
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
