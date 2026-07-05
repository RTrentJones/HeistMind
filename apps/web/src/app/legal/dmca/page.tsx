import type { Metadata } from 'next';
import { DmcaContent } from '@/features/legal/components/DmcaContent';

export const metadata: Metadata = {
  title: 'DMCA & Copyright Policy — HeistMind',
  description: 'How to report copyright infringement on HeistMind, and how counter-notices work.',
};

export default function DmcaPage() {
  return <DmcaContent />;
}
