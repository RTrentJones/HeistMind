import type { Metadata } from 'next';
import { TermsContent } from '@/features/legal/components/TermsContent';

export const metadata: Metadata = {
  title: 'Terms of Service — HeistMind',
  description: 'The terms covering your HeistMind account, your content, and use of the service.',
};

export default function TermsPage() {
  return <TermsContent />;
}
