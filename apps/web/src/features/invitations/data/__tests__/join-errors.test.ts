// F94 — join failures map to specific copy keys; typed/pasted codes normalise.
import { describe, expect, it } from 'vitest';
import { RepositoryError } from '@/lib/query/result';
import { joinFailureReason, normalizeJoinCode } from '../mutations';

describe('joinFailureReason (the 00023 redeem_invite_code messages)', () => {
  it.each([
    ['Join code not found', 'notFound'],
    ['Invite code not found or no longer active', 'notFound'],
    ['Join code was revoked', 'revoked'],
    ['Join code has expired', 'expired'],
    ['Join code has no uses left', 'usedUp'],
    ['You were removed from this campaign', 'removed'],
    ['fetch failed', 'generic'],
  ])('%s → %s', (message, reason) => {
    expect(joinFailureReason(new RepositoryError(message, 'P0002'))).toBe(reason);
  });

  it('a non-error is generic', () => {
    expect(joinFailureReason('boom')).toBe('generic');
  });
});

describe('normalizeJoinCode', () => {
  it('trims, upper-cases and drops spaces/dashes', () => {
    expect(normalizeJoinCode('  abcd-2345 ')).toBe('ABCD2345');
    expect(normalizeJoinCode('ab cd 23 45')).toBe('ABCD2345');
  });
});
