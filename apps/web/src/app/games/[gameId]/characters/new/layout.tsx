import type { Metadata } from 'next';
import { appPageMetadata } from '@/lib/site';

// Server layout so this client-rendered section gets a real <title> ("New character · HeistMind").
export const metadata: Metadata = appPageMetadata('New character');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
