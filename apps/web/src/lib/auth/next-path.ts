// Return-to intent across the Discord OAuth round trip (F94 — a signed-out person opening an
// invite link lands back on /join/<code>, not the dashboard).
//
// The intent travels two ways, both validated on the way OUT by `safeNextPath`:
//   1. a `next` query param on the OAuth callback URL (`/auth/callback?next=/join/ABCD2345`);
//   2. a sessionStorage copy written at sign-in time (same tab survives the round trip), the
//      fallback if the provider/allowlist drops the query string.
// Only a same-origin, absolute PATH is ever honoured — never a full URL, a protocol-relative
// `//host`, a backslash trick, or the callback itself — so `next` can't become an open redirect.

const STORAGE_KEY = 'heistmind.auth.next';
const PROBE_ORIGIN = 'https://heistmind.invalid';

/** A same-origin path to return to, or null when `raw` is missing/unsafe. */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string' || raw.length > 512) return null;
  // Must be a rooted path. Rejects `https://…`, `//evil.com`, `/\evil.com`, and control chars.
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null;
  if (
    raw.includes('\\') ||
    [...raw].some(ch => ch.charCodeAt(0) < 0x20 || ch.charCodeAt(0) === 0x7f)
  )
    return null;
  let url: URL;
  try {
    url = new URL(raw, PROBE_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== PROBE_ORIGIN) return null;
  // Never bounce back into the callback (a loop) — land on home instead.
  if (url.pathname.startsWith('/auth/')) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Remember where to return after sign-in (no-op when unsafe or storage is unavailable). */
export function rememberNextPath(path: string | null | undefined): void {
  const safe = safeNextPath(path);
  try {
    if (safe) window.sessionStorage.setItem(STORAGE_KEY, safe);
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode / blocked storage: the query param still carries the intent.
  }
}

/** Read AND clear the remembered path (one-shot), validated again on the way out. */
export function takeRememberedNextPath(): string | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
    return safeNextPath(raw);
  } catch {
    return null;
  }
}

/** The OAuth callback URL for this origin, carrying a validated `next`. */
export function callbackUrl(origin: string, provider: string, next?: string | null): string {
  const url = new URL('/auth/callback', origin);
  url.searchParams.set('provider', provider);
  const safe = safeNextPath(next);
  if (safe) url.searchParams.set('next', safe);
  return url.toString();
}
