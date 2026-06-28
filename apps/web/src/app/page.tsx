'use client';

import { useAuth } from '@/features/auth/stores/auth-store';
import { Dashboard } from '@/features/dashboard/components/Dashboard';
import { HomePage } from '@/features/marketing/components/HomePage';

/**
 * `/` is the front door for both audiences: the marketing `HomePage` when logged out, and the
 * personal `Dashboard` once authenticated (the OAuth callback redirects here after sign-in).
 */
export default function Home() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Dashboard /> : <HomePage />;
}
