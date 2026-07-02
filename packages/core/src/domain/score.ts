// Scores / operations — the per-operation unit of play.
/** A score / operation — the per-operation unit of play that per-score loadout hangs off (BitD). */
export type ScoreStatus = 'active' | 'completed';

export interface Score {
  id: string;
  gameId: string;
  name: string | null;
  status: ScoreStatus;
  notes: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateScoreData {
  gameId: string;
  name?: string;
  notes?: string;
}

export interface UpdateScoreData {
  name?: string;
  status?: ScoreStatus;
  notes?: string;
}
