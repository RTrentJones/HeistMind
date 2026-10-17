import { describe, expect, it } from 'vitest';
import { isComingSoonAllowed, resolveComingSoon } from '../coming-soon';

// The middleware redirects everything NOT allowed here to '/', so this list is the entire
// reachable surface during the gate. Pin it: the holding page + the public legal pages only.
describe('isComingSoonAllowed', () => {
  it('allows the holding page and the public legal pages', () => {
    for (const p of ['/', '/legal', '/legal/terms', '/legal/privacy', '/legal/dmca']) {
      expect(isComingSoonAllowed(p)).toBe(true);
    }
  });

  it('blocks the authenticated app and the sign-in return path', () => {
    for (const p of [
      '/games',
      '/characters',
      '/characters/abc',
      '/rulesets',
      '/rulesets/new',
      '/settings',
      '/auth/callback',
    ]) {
      expect(isComingSoonAllowed(p)).toBe(false);
    }
  });

  it('lets the verify gate read the deploy identity', () => {
    expect(isComingSoonAllowed('/__version')).toBe(true);
    expect(isComingSoonAllowed('/__version/x')).toBe(false);
  });

  it('does not treat a lookalike prefix as legal', () => {
    expect(isComingSoonAllowed('/legalese')).toBe(false);
  });
});

// Prod has no NEXT_PUBLIC_COMING_SOON today, so the VERCEL_ENV default is what keeps it gated;
// the explicit flag is the launch switch (0) and a force-on for any other environment (1).
describe('resolveComingSoon', () => {
  it('defaults to gated on the production deployment only', () => {
    expect(resolveComingSoon(undefined, 'production')).toBe(true);
    expect(resolveComingSoon(undefined, 'preview')).toBe(false);
    expect(resolveComingSoon(undefined, 'development')).toBe(false);
    expect(resolveComingSoon(undefined, '')).toBe(false);
    expect(resolveComingSoon(undefined, undefined)).toBe(false);
  });

  it('opens prod when explicitly switched off', () => {
    for (const off of ['0', 'false', 'off', ' OFF ']) {
      expect(resolveComingSoon(off, 'production')).toBe(false);
    }
  });

  it('forces the gate on anywhere when explicitly switched on', () => {
    for (const on of ['1', 'true', 'on']) {
      expect(resolveComingSoon(on, 'preview')).toBe(true);
      expect(resolveComingSoon(on, undefined)).toBe(true);
    }
  });

  it('ignores an unrecognized value and falls back to the environment default', () => {
    expect(resolveComingSoon('maybe', 'production')).toBe(true);
    expect(resolveComingSoon('', 'preview')).toBe(false);
  });
});
