import type { Metadata } from 'next';
import { appPageMetadata } from '@/lib/site';

// Server layout so this client-rendered section gets a real <title> ("Campaign · HeistMind").
export const metadata: Metadata = appPageMetadata('Campaign');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
