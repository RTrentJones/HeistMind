import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/site';
import { AcceptableUseContent } from '@/features/legal/components/AcceptableUseContent';

export const metadata: Metadata = publicPageMetadata({
  title: 'Acceptable Use Policy',
  description: 'What you may upload to HeistMind, and the lines you may not cross.',
  path: '/legal/acceptable-use',
});

export default function AcceptableUsePage() {
  return <AcceptableUseContent />;
}
