import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/site';
import { LegalHubContent } from '@/features/legal/components/LegalHubContent';

export const metadata: Metadata = publicPageMetadata({
  title: 'Legal',
  description: 'HeistMind terms of service, privacy policy, DMCA policy, and content licenses.',
  path: '/legal',
});

export default function LegalPage() {
  return <LegalHubContent />;
}
