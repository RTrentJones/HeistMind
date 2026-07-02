import { describe, it, expect } from 'vitest';
import { CLOCK_SEGMENTS, isClockSegments, clampFilled, clockComplete } from './clocks';

describe('clock rules', () => {
  it('CLOCK_SEGMENTS are the BitD sizes', () => {
    expect(CLOCK_SEGMENTS).toEqual([4, 6, 8, 10, 12]);
  });

  it('isClockSegments accepts only legal sizes', () => {
    expect(isClockSegments(4)).toBe(true);
    expect(isClockSegments(8)).toBe(true);
    expect(isClockSegments(12)).toBe(true);
    expect(isClockSegments(5)).toBe(false);
    expect(isClockSegments(0)).toBe(false);
    expect(isClockSegments(20)).toBe(false);
  });

  it('clampFilled keeps the fill within [0, segments]', () => {
    expect(clampFilled(3, 8)).toBe(3);
    expect(clampFilled(-2, 8)).toBe(0);
    expect(clampFilled(99, 8)).toBe(8);
    expect(clampFilled(8, 8)).toBe(8);
    expect(clampFilled(2.7, 8)).toBe(2); // floored
  });

  it('clampFilled tolerates non-finite input and odd segment counts', () => {
    expect(clampFilled(NaN, 8)).toBe(0);
    expect(clampFilled(5, -3)).toBe(0); // negative segments → no room
    expect(clampFilled(5, 4.9)).toBe(4); // segments floored
  });

  it('clockComplete is true only at/over the segment count', () => {
    expect(clockComplete(8, 8)).toBe(true);
    expect(clockComplete(9, 8)).toBe(true);
    expect(clockComplete(7, 8)).toBe(false);
    expect(clockComplete(0, 4)).toBe(false);
    expect(clockComplete(0, 0)).toBe(false);
  });
});
