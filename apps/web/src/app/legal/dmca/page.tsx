import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/site';
import { DmcaContent } from '@/features/legal/components/DmcaContent';

export const metadata: Metadata = publicPageMetadata({
  title: 'DMCA & Copyright Policy',
  description: 'How to report copyright infringement on HeistMind, and how counter-notices work.',
  path: '/legal/dmca',
});

export default function DmcaPage() {
  return <DmcaContent />;
}
