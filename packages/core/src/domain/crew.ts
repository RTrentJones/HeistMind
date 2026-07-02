// The shared crew sheet — one per game.
/** The shared crew sheet — one per game. FitD bounds: tier 0–4, heat 0–9, wanted 0–4. */
export interface Crew {
  id: string;
  gameId: string;
  name: string | null;
  crewType: string | null;
  tier: number;
  rep: number;
  heat: number;
  wanted: number;
  hold: CrewHold;
  coin: number;
  vault: number;
  crewAbilities: string[];
  /** Held claims (names or ruleset claim ids). */
  claims: string[];
  /** Cohort descriptions (gangs / experts). */
  cohorts: string[];
  /** Current value of each ruleset resource pool, keyed by pool id (defaults to `{}` when unused). */
  resources: Record<string, number>;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CrewHold = 'weak' | 'strong';

export interface CreateCrewData {
  gameId: string;
  name?: string;
  crewType?: string;
}

export interface UpdateCrewData {
  name?: string;
  crewType?: string;
  tier?: number;
  rep?: number;
  heat?: number;
  wanted?: number;
  hold?: CrewHold;
  coin?: number;
  vault?: number;
  crewAbilities?: string[];
  claims?: string[];
  cohorts?: string[];
  resources?: Record<string, number>;
}
