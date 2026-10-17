'use client';

import { captureError } from '@heist-mind/telemetry';
import { useAuth, useAuthActions } from '@/features/auth/stores/auth-store';
import { useNotificationStore } from '@/shared/stores/notification-store';
import { errorMessage } from '@/lib/query/result';
import i18n from '@/lib/i18n';

/**
 * Discord OAuth sign-in with the standard failure surfacing (error toast + console diagnostic,
 * F58). THE one sign-in handler — every sign-in button goes through it instead of hand-rolling
 * the try/catch (it was copy-pasted five times before this existed).
 */
export function useSignIn() {
  const { isLoading } = useAuth();
  const { signInWithProvider } = useAuthActions();

  /** `next` — a same-origin path to land on after sign-in (validated; unsafe values are dropped). */
  const signIn = async (options?: { next?: string | null }) => {
    try {
      await signInWithProvider('discord', options);
    } catch (err) {
      captureError(err, { 'error.surface': 'auth.sign-in' });
      useNotificationStore
        .getState()
        .error(i18n.t('errors:auth.signInFailed'), errorMessage(err) || undefined);
    }
  };

  return { signIn, isSigningIn: isLoading };
}
