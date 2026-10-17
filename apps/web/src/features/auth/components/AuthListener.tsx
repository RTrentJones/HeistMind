'use client';

import { useLayoutEffect } from 'react';
import { initAuthListener, rehydrateAuthStore } from '@/features/auth/stores/auth-store';

/**
 * Mounts the auth session listener once, app-wide (see initAuthListener — no import-time I/O), and
 * hydrates the persisted auth hint. A LAYOUT effect, so the hydrated (possibly signed-in) state is
 * committed before the browser paints the hydrated tree — the server HTML and the first client
 * render both see the signed-out defaults (no hydration mismatch), and a returning user doesn't see
 * a painted flash of signed-out UI after hydration.
 */
export function AuthListener() {
  useLayoutEffect(() => {
    rehydrateAuthStore();
    initAuthListener();
  }, []);
  return null;
}
