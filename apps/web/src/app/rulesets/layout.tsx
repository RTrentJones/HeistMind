import type { Metadata } from 'next';
import { appPageMetadata } from '@/lib/site';

// Server layout so this client-rendered section gets a real <title> ("Rulesets · HeistMind").
export const metadata: Metadata = appPageMetadata('Rulesets');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
