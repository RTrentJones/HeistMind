'use client';

import { useAuth } from '@/features/auth/stores/auth-store';
import { Dashboard } from '@/features/dashboard/components/Dashboard';

/**
 * The `/` front door for both audiences: the server-rendered marketing sections (passed down from
 * the server `page.tsx`) for visitors, the personal Dashboard once authenticated (the OAuth
 * callback redirects here). Auth lives in the browser (Supabase session + persisted store), so the
 * swap necessarily happens client-side; the marketing HTML is what crawlers and first paints see.
 */
export function HomeSwitch({ marketing }: { marketing: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Dashboard /> : <>{marketing}</>;
}
