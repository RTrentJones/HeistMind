import type { Metadata } from 'next';
import { PrivacyContent } from '@/features/legal/components/PrivacyContent';

export const metadata: Metadata = {
  title: 'Privacy Policy — HeistMind',
  description: 'What HeistMind collects (very little), who processes it, and how to delete it.',
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
