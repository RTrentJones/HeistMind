// Pure progress-clock rules (no I/O), so the UI and the DB layer enforce identical bounds.
// A FitD clock has 4/6/8/10/12 segments and fills from 0 to that count; ticking never overflows
// or goes negative. The repository clamps every write through these helpers.

import type { ClockSegments } from './domain-types';

/** The legal segment counts for a clock. */
export const CLOCK_SEGMENTS: ClockSegments[] = [4, 6, 8, 10, 12];

/** Whether `n` is a legal segment count. */
export function isClockSegments(n: number): n is ClockSegments {
  return (CLOCK_SEGMENTS as number[]).includes(n);
}

/** Clamp a fill value into `[0, segments]` (a tick can't overflow or go negative). */
export function clampFilled(filled: number, segments: number): number {
  if (!Number.isFinite(filled)) return 0;
  return Math.max(0, Math.min(Math.floor(filled), Math.max(0, Math.floor(segments))));
}

/** Whether the clock has filled completely (the situation has come to a head). */
export function clockComplete(filled: number, segments: number): boolean {
  return segments > 0 && filled >= segments;
}
