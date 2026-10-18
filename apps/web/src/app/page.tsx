import type { Metadata } from 'next';
import { ComingSoon } from '@/features/marketing/components/ComingSoon';
import { HomePage } from '@/features/marketing/components/HomePage';
import { HomeSwitch } from '@/features/marketing/components/HomeSwitch';
import { COMING_SOON } from '@/lib/coming-soon';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from '@/lib/site';

// `/` — real, server-rendered metadata (absolute title: the brand line, no template suffix) and
// the marketing sections in the initial HTML (i18n initializes synchronously, so the client
// marketing components SSR their copy). The tiny client HomeSwitch swaps to the Dashboard after
// hydration for a signed-in visitor.
export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: '/',
    siteName: SITE_NAME,
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESCRIPTION },
};

export default function Home() {
  // Prod holding page until launch (on by default for the production deployment only;
  // NEXT_PUBLIC_COMING_SOON overrides — see lib/coming-soon.ts).
  if (COMING_SOON) return <ComingSoon />;
  return <HomeSwitch marketing={<HomePage />} />;
}
