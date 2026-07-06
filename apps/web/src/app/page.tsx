import type { Metadata } from 'next';
import { ComingSoon } from '@/features/marketing/components/ComingSoon';
import { HomePage } from '@/features/marketing/components/HomePage';
import { HomeSwitch } from '@/features/marketing/components/HomeSwitch';
import { COMING_SOON } from '@/lib/coming-soon';

// `/` is the one public page — give it real, server-rendered metadata (the shell keeps the
// site-wide defaults). The marketing sections render on the server and stream in the initial HTML;
// the tiny client HomeSwitch swaps to the Dashboard after hydration for a signed-in visitor.
export const metadata: Metadata = {
  title: 'HeistMind — rules-driven character & crew manager for Forged in the Dark',
  description:
    'Build rules-valid Blades in the Dark scoundrels and crews, bring them to any table, and run async play-by-post campaigns on Discord with shared rolls, clocks, and campaign logs.',
};

export default function Home() {
  // Prod holding page while beta is polished (gate off by default; see lib/coming-soon.ts).
  if (COMING_SOON) return <ComingSoon />;
  return <HomeSwitch marketing={<HomePage />} />;
}
