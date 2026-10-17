import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/site';
import { LicensesContent } from '@/features/legal/components/LicensesContent';

export const metadata: Metadata = publicPageMetadata({
  title: 'Content Licenses & Attributions',
  description: 'The licenses behind HeistMind’s built-in rulesets and application code.',
  path: '/legal/licenses',
});

export default function LicensesPage() {
  return <LicensesContent />;
}
