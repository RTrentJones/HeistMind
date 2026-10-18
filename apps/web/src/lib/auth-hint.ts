/**
 * UX r3 (F98) — the pre-hydration SIGNED-IN HINT, the auth sibling of the theme script
 * (theme-script.ts). Auth lives in the browser (Supabase session + the persisted `auth-store`
 * slice), so the server HTML is always the signed-out page; without a hint a returning user saw
 * the marketing page / "Sign in to continue" gate / Sign In header for ~1s before the swap.
 *
 * The inline script runs in <head> before first paint and sets `<html data-auth="in">` when this
 * browser looks signed in: the persisted auth-store says so, or a Supabase session key
 * (`sb-<ref>-auth-token`) is present — the latter covers a live session with no stored display
 * hint. CSS (globals.css) then hides `[data-auth-only=out]` (marketing, the header's Sign In
 * actions) and shows `[data-auth-only=in]` (neutral skeletons) until React takes over; after
 * hydration <AuthListener/> keeps the attribute in sync with the store.
 *
 * A HINT, never proof: every page still waits for the real session check before showing
 * anything private, and a stale hint just means a skeleton until the check says signed-out.
 * Keep `hasAuthHint` and the script string in lockstep (a unit test evaluates both).
 */

export const AUTH_STORE_KEY = 'auth-store';
const SUPABASE_SESSION_KEY = /^sb-.+-auth-token$/;

type HintStorage = Pick<Storage, 'getItem' | 'key' | 'length'>;

/** Does this browser's storage look signed in? (Same logic as the inline script.) */
export function hasAuthHint(storage: HintStorage | null | undefined): boolean {
  if (!storage) return false;
  try {
    const raw = storage.getItem(AUTH_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { isAuthenticated?: unknown } } | null;
      if (parsed?.state?.isAuthenticated === true) return true;
    }
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && SUPABASE_SESSION_KEY.test(key)) return true;
    }
  } catch {
    // Storage blocked / malformed JSON → no hint (the signed-out page is the safe default).
  }
  return false;
}

/** Client-only convenience: the hint for `window.localStorage` (false on the server). */
export function readAuthHint(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return hasAuthHint(window.localStorage);
  } catch {
    return false;
  }
}

/** The inline <head> script (plain string: the server-component layout embeds it). */
export function authHintInitScript(): string {
  const key = JSON.stringify(AUTH_STORE_KEY);
  return (
    '(function(){try{var s=window.localStorage,h=false,a=s.getItem(' +
    key +
    ');' +
    'if(a){var p=JSON.parse(a);if(p&&p.state&&p.state.isAuthenticated===true)h=true;}' +
    'if(!h){for(var i=0;i<s.length;i++){var k=s.key(i);if(k&&/^sb-.+-auth-token$/.test(k)){h=true;break;}}}' +
    "if(h)document.documentElement.setAttribute('data-auth','in');}catch(e){}})();"
  );
}

/** Mirror the store into `<html data-auth>` after hydration (signed in, or still resolving one). */
export function applyAuthAttribute(signedInOrPending: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (signedInOrPending) root.setAttribute('data-auth', 'in');
  else root.removeAttribute('data-auth');
}
