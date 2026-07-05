import type { Metadata } from 'next';
import { LegalHubContent } from '@/features/legal/components/LegalHubContent';

export const metadata: Metadata = {
  title: 'Legal — HeistMind',
  description: 'HeistMind terms of service, privacy policy, DMCA policy, and content licenses.',
};

export default function LegalPage() {
  return <LegalHubContent />;
}
