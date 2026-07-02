// FitD progress clocks.
/** A FitD progress clock: a named ring of `segments` (4/6/8/10/12) that fills as a situation develops. */
export interface Clock {
  id: string;
  gameId: string;
  name: string;
  segments: ClockSegments;
  filled: number;
  /** Optional link to another campaign object (e.g. a faction project clock). */
  linkedType: string | null;
  linkedId: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The legal segment counts for a FitD clock. */
export type ClockSegments = 4 | 6 | 8 | 10 | 12;

export interface CreateClockData {
  gameId: string;
  name: string;
  segments: ClockSegments;
  filled?: number;
  linkedType?: string;
  linkedId?: string;
}

export interface UpdateClockData {
  name?: string;
  segments?: ClockSegments;
  filled?: number;
}
