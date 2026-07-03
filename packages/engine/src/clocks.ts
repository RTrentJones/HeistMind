// Clock use-cases: a tick clamps through the rules; FILLING a clock is the table-visible milestone
// ("the situation comes to a head"), so completion — and only completion — logs a 'clock' event.
// Routine ticks stay panel-only state (the feed records milestones, not bookkeeping).
import { clampFilled, clockComplete, type Clock, type Result } from '@heist-mind/core';
import type { DatabaseRepositories } from '@heist-mind/database';

export interface TickClockInput {
  /** The client's loaded clock (the write targets its id; the tick runs on its current fill). */
  clock: Clock;
  userId: string;
  /** Segments to add (negative to reduce); clamped into [0, segments]. */
  delta: number;
  /** Log-event copy used only when this tick completes the clock. */
  logLabel: string;
  logNote: string;
}

export interface TickClockOutcome {
  clock: Clock;
  /** True when THIS tick filled the clock (drives the client's "came to a head" phrasing). */
  completed: boolean;
}

/** Tick a clock (clamped); when the tick fills it, log the completion to the feed. */
export async function tickClock(
  repos: DatabaseRepositories,
  input: TickClockInput
): Promise<Result<TickClockOutcome>> {
  const { clock, delta } = input;
  const filled = clampFilled(clock.filled + delta, clock.segments);
  const updated = await repos.clocks.update(clock.id, { filled });
  if (!updated.success) return updated as Result<never>;
  const completed =
    clockComplete(filled, clock.segments) && !clockComplete(clock.filled, clock.segments);
  if (!completed) return { success: true, data: { clock: updated.data, completed } };
  const logged = await repos.rolls.create(input.userId, {
    gameId: clock.gameId,
    kind: 'clock',
    label: input.logLabel,
    dice: 0,
    results: [],
    note: input.logNote,
  });
  if (!logged.success) return logged as Result<never>;
  return { success: true, data: { clock: updated.data, completed } };
}
