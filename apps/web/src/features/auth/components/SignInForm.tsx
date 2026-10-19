'use client';

import type { ReactNode } from 'react';
import { useSignIn } from '@/features/auth/hooks/use-sign-in';
import { safeNextPath } from '@/lib/auth/next-path';

/** The no-JS sign-in route: it starts the same Discord OAuth once its page has hydrated. */
export const SIGN_IN_PATH = '/auth/signin';

/**
 * Progressive-enhancement wrapper for Discord sign-in buttons (round 4 P2-N2). The header and the
 * landing CTAs paint from SSR (F98) and LOOK live before React hydrates — but their onClick isn't
 * attached yet, so an early click did nothing. Wrapping them in a real GET form fixes that without
 * a disabled flash: before hydration, a click (or Enter) submits natively to `/auth/signin?next=…`,
 * which starts the OAuth on arrival; after hydration, `onSubmit` intercepts and starts it in place
 * exactly as before. Children are the submit `<Button type='submit'>`s (more than one may share a
 * form). `display: contents`, so the form never changes the layout it sits in.
 */
export function SignInForm({ next, children }: { next?: string | null; children: ReactNode }) {
  const { signIn } = useSignIn();
  const safeNext = safeNextPath(next ?? null);
  return (
    <form
      action={SIGN_IN_PATH}
      method='get'
      className='contents'
      onSubmit={e => {
        e.preventDefault();
        void signIn(safeNext ? { next: safeNext } : undefined);
      }}
    >
      {safeNext && <input type='hidden' name='next' value={safeNext} />}
      {children}
    </form>
  );
}
