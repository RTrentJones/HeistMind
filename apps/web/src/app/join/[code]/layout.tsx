import type { Metadata } from 'next';
import { appPageMetadata } from '@/lib/site';

// Server layout so the invite link gets a real <title> ("Join a campaign · HeistMind"), never indexed.
export const metadata: Metadata = appPageMetadata('Join a campaign');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
