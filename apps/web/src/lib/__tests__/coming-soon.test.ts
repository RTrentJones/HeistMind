import { describe, expect, it } from 'vitest';
import { isComingSoonAllowed } from '../coming-soon';

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

  it('does not treat a lookalike prefix as legal', () => {
    expect(isComingSoonAllowed('/legalese')).toBe(false);
  });
});
