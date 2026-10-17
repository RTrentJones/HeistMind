import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/site';
import { PrivacyContent } from '@/features/legal/components/PrivacyContent';

export const metadata: Metadata = publicPageMetadata({
  title: 'Privacy Policy',
  description: 'What HeistMind collects (very little), who processes it, and how to delete it.',
  path: '/legal/privacy',
});

export default function PrivacyPage() {
  return <PrivacyContent />;
}
