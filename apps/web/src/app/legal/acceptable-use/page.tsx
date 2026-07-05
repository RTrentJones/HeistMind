import type { Metadata } from 'next';
import { AcceptableUseContent } from '@/features/legal/components/AcceptableUseContent';

export const metadata: Metadata = {
  title: 'Acceptable Use Policy — HeistMind',
  description: 'What you may upload to HeistMind, and the lines you may not cross.',
};

export default function AcceptableUsePage() {
  return <AcceptableUseContent />;
}
