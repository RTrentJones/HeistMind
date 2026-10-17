// F94 — the OAuth return-to `next` must never become an open redirect.
import { afterEach, describe, expect, it } from 'vitest';
import {
  callbackUrl,
  rememberNextPath,
  safeNextPath,
  takeRememberedNextPath,
} from '@/lib/auth/next-path';

describe('safeNextPath', () => {
  it.each([
    ['/join/ABCD2345', '/join/ABCD2345'],
    ['/games#join', '/games#join'],
    ['/games/new?ruleset=1', '/games/new?ruleset=1'],
    ['/discord', '/discord'],
  ])('keeps the same-origin path %s', (raw, out) => {
    expect(safeNextPath(raw)).toBe(out);
  });

  it.each([
    null,
    undefined,
    '',
    'join/ABC',
    'https://evil.example.com/',
    '//evil.example.com/x',
    '/\\evil.example.com',
    '/%5Cevil',
    '/ok\\..\\evil',
    'javascript:alert(1)',
    '/\u0000evil',
    '/auth/callback?next=/x',
    `/${'a'.repeat(600)}`,
  ])('rejects %j', raw => {
    const out = safeNextPath(raw);
    // '/%5Cevil' stays a harmless same-origin path; everything else is refused.
    if (raw === '/%5Cevil') expect(out).toBe('/%5Cevil');
    else expect(out).toBeNull();
  });
});

describe('callbackUrl', () => {
  it('carries a validated next, and drops an unsafe one', () => {
    const ok = new URL(callbackUrl('https://www.heistmind.com', 'discord', '/join/AB12CD34'));
    expect(ok.origin).toBe('https://www.heistmind.com');
    expect(ok.pathname).toBe('/auth/callback');
    expect(ok.searchParams.get('provider')).toBe('discord');
    expect(ok.searchParams.get('next')).toBe('/join/AB12CD34');
    const bad = new URL(callbackUrl('https://www.heistmind.com', 'discord', '//evil.com'));
    expect(bad.searchParams.has('next')).toBe(false);
  });
});

describe('remember/take (sessionStorage fallback)', () => {
  afterEach(() => sessionStorage.clear());

  it('is one-shot and re-validated on the way out', () => {
    rememberNextPath('/join/AB12CD34');
    expect(takeRememberedNextPath()).toBe('/join/AB12CD34');
    expect(takeRememberedNextPath()).toBeNull();

    // Something tampered with storage directly → still refused.
    sessionStorage.setItem('heistmind.auth.next', 'https://evil.example.com');
    expect(takeRememberedNextPath()).toBeNull();
  });

  it('a plain sign-in (no next) clears a stale intent', () => {
    rememberNextPath('/join/AB12CD34');
    rememberNextPath(undefined);
    expect(takeRememberedNextPath()).toBeNull();
  });
});
