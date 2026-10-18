'use client';

import { useLayoutEffect } from 'react';
import {
  initAuthListener,
  rehydrateAuthStore,
  selectAuthPending,
  useAuthStore,
} from '@/features/auth/stores/auth-store';
import { applyAuthAttribute } from '@/lib/auth-hint';

/**
 * Mounts the auth session listener once, app-wide (see initAuthListener — no import-time I/O), and
 * hydrates the persisted auth hint. A LAYOUT effect, so the hydrated (possibly signed-in) state is
 * committed before the browser paints the hydrated tree — the server HTML and the first client
 * render both see the signed-out defaults (no hydration mismatch), and a returning user doesn't see
 * a painted flash of signed-out UI after hydration.
 *
 * It also keeps `<html data-auth>` (first set by the pre-hydration hint script, lib/auth-hint.ts)
 * in step with the store, so the CSS that hides signed-out-only chrome for a likely-signed-in
 * visitor lets go the moment the session check says they're signed out (F98).
 */
export function AuthListener() {
  useLayoutEffect(() => {
    rehydrateAuthStore();
    initAuthListener();
    const sync = (s: ReturnType<typeof useAuthStore.getState>) =>
      applyAuthAttribute(s.isAuthenticated || selectAuthPending(s));
    sync(useAuthStore.getState());
    return useAuthStore.subscribe(sync);
  }, []);
  return null;
}
