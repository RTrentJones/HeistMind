import { describe, expect, it } from 'vitest';
import { rollPool } from '../roll-pool';

describe('rollPool', () => {
  it('action: pool = rating, through the FitD zero-dice rule', () => {
    expect(rollPool({ mode: 'action', rating: 3 })).toEqual({ count: 3, zeroDice: false });
    expect(rollPool({ mode: 'action', rating: 0 })).toEqual({ count: 2, zeroDice: true });
  });

  it('action: push and devil’s bargain each add one die (they stack)', () => {
    expect(rollPool({ mode: 'action', rating: 2, push: true })).toEqual({
      count: 3,
      zeroDice: false,
    });
    expect(rollPool({ mode: 'action', rating: 2, push: true, bargain: true })).toEqual({
      count: 4,
      zeroDice: false,
    });
    // A pushed 0-rating action becomes a REAL 1-die pool (the extra die lifts the zero-dice rule).
    expect(rollPool({ mode: 'action', rating: 0, push: true })).toEqual({
      count: 1,
      zeroDice: false,
    });
  });

  it('fortune: the chosen die count, floored at 1, never zero-dice', () => {
    expect(rollPool({ mode: 'fortune', rating: 0, fortune: 3 })).toEqual({
      count: 3,
      zeroDice: false,
    });
    expect(rollPool({ mode: 'fortune', rating: 0, fortune: 0 })).toEqual({
      count: 1,
      zeroDice: false,
    });
  });

  it('resistance: the attribute rating through the zero-dice rule; moves never apply', () => {
    expect(rollPool({ mode: 'resistance', rating: 2, push: true, bargain: true })).toEqual({
      count: 2,
      zeroDice: false,
    });
    expect(rollPool({ mode: 'resistance', rating: 0 })).toEqual({ count: 2, zeroDice: true });
  });
});
