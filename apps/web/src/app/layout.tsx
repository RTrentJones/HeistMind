import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { I18nProvider } from '@/lib/i18n/provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Canonical base for metadata (canonical link, OG/Twitter URLs, sitemap). Driven by SITE_URL
// per env (prod → https://heistmind.com, beta → the beta subdomain), defaulting to the canonical
// brand domain when unset (local dev). See infra/heistmind.tf for the per-env SITE_URL values.
const siteUrl = process.env.SITE_URL ?? 'https://heistmind.com';

const title = 'HeistMind - Forged in the Dark Platform';
const description =
  'The definitive platform for Forged in the Dark campaigns. Create characters, run games, forge your legacy in the shadows or whatever world you care to imagine.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  alternates: { canonical: '/' },
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: 'HeistMind',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
