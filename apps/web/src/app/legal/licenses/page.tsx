import type { Metadata } from 'next';
import { LicensesContent } from '@/features/legal/components/LicensesContent';

export const metadata: Metadata = {
  title: 'Content Licenses & Attributions — HeistMind',
  description: 'The licenses behind HeistMind’s built-in rulesets and application code.',
};

export default function LicensesPage() {
  return <LicensesContent />;
}
