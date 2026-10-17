import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/site';
import { TermsContent } from '@/features/legal/components/TermsContent';

export const metadata: Metadata = publicPageMetadata({
  title: 'Terms of Service',
  description: 'The terms covering your HeistMind account, your content, and use of the service.',
  path: '/legal/terms',
});

export default function TermsPage() {
  return <TermsContent />;
}
