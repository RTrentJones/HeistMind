import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Cinzel, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

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

// Canonical base for metadata (canonical link, OG/Twitter URLs, sitemap). Driven by SITE_URL
// per env (prod → https://www.heistmind.com, beta → the beta subdomain), defaulting to the
// canonical brand domain when unset (local dev). See infra/heistmind.tf for the per-env SITE_URL
// values. www is the served/primary domain (the apex heistmind.com 307-redirects to it).
const siteUrl = process.env.SITE_URL ?? 'https://www.heistmind.com';

const title = 'HeistMind - Forged in the Dark Platform';
const description =
  'The definitive platform for Forged in the Dark campaigns. Create characters, run games, forge your legacy in the shadows or whatever world you care to imagine.';

// Favicons/app icons come from the App Router magic files (app/favicon.ico, app/icon.svg,
// app/apple-icon.png) — Next emits the <link> tags automatically. Here we only wire the PWA
// manifest (public/site.webmanifest → /icon-192.png, /icon-512.png).
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  manifest: '/site.webmanifest',
  alternates: { canonical: '/' },
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: 'HeistMind',
    type: 'website',
  },
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
