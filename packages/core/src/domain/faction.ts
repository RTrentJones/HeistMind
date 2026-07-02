// City factions and their status toward the crew.
/** A city power. FitD bounds: tier 0–6, status −3 (at war) … +3 (allied). */
export interface Faction {
  id: string;
  gameId: string;
  name: string;
  factionType: string | null;
  tier: number;
  status: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFactionData {
  gameId: string;
  name: string;
  factionType?: string;
  tier?: number;
  status?: number;
}

export interface UpdateFactionData {
  name?: string;
  factionType?: string;
  tier?: number;
  status?: number;
  notes?: string;
}
