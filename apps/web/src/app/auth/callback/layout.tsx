import type { Metadata } from 'next';
import { appPageMetadata } from '@/lib/site';

// Server layout so this client-rendered section gets a real <title> ("Signing in · HeistMind").
export const metadata: Metadata = appPageMetadata('Signing in');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
