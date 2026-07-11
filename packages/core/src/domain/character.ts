// A scoundrel: the character row, its JSONB CharacterData build, and the validation/advancement
// contract the rules engine speaks.
import type { Game } from './game';
import type { Profile } from './profile';
import type { Ruleset } from './ruleset';
import type { ValidationError } from './result';

export interface Character {
  id: string;
  createdBy: string;
  /** The campaign this character is currently linked into, or `null` when it's standalone
   * ("My Characters" — Phase 5 portable characters). Single active campaign: a character is in at
   * most one game at a time. */
  gameId: string | null;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  characterData: CharacterData;
  playbookType: string;
  experiencePoints: number;
  advancementHistory: AdvancementRecord[];
  status: CharacterStatus;
  isTemplate: boolean;
  originalRulesetId: string | null;
  adaptations: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type CharacterStatus = 'active' | 'inactive' | 'retired' | 'dead';

export interface CharacterData {
  playbook: string;
  heritage?: string;
  background?: string;
  vice?: string;
  attributes: Record<string, number>;
  skills: Record<string, number>;
  specialAbilities: string[];
  items: CharacterItem[];
  stress: number;
  trauma: string[];
  /** Harm entries per level (each a short description). Bounded by the ruleset's `harm` rules. */
  harm?: CharacterHarm;
  /** Chosen load level + the items carried this score (item ids from the ruleset). */
  loadout?: CharacterLoadout;
  coins: number;
  /** Coin saved toward retirement (separate from carried `coins`). */
  stash?: number;
  /** BitD-style XP track marks (only when the ruleset opts into `advancement.xpTracks`). */
  xp?: CharacterXp;
  contacts: CharacterContact[];
  custom: Record<string, unknown>;
}

export interface CharacterXp {
  /** Marks in the playbook XP track. */
  playbook: number;
  /** Marks in each attribute XP track, keyed by attribute id. */
  attributes: Record<string, number>;
}

export interface CharacterItem {
  id: string;
  name: string;
  description?: string;
  load?: number;
  quality?: number;
  equipped: boolean;
}

export type LoadLevel = 'light' | 'normal' | 'heavy';

export interface CharacterLoadout {
  level: LoadLevel;
  /** Item ids (from `RulesetContent.equipment.items`) marked as carried. */
  items: string[];
  /**
   * The score this loadout was last set under (BitD: load is per-operation). When the campaign's
   * active score differs from this, the loadout is stale and the sheet prompts a reset. Absent for
   * groups not using scores — loadout then behaves as a single resettable "current" loadout.
   */
  scoreId?: string;
  /**
   * Armor item ids expended this score (F44 — "spend armor" reduces incoming harm one level).
   * Lives on the loadout because armor is per-score: writing a fresh loadout refreshes it.
   */
  armorSpent?: string[];
}

export interface CharacterHarm {
  /** Level 1 — lesser harm (reduced effect). */
  lesser: string[];
  /** Level 2 — moderate harm (reduced effect / -1d). */
  moderate: string[];
  /** Level 3 — severe harm (need help to act). */
  severe: string[];
}

/** The three FitD harm-track levels, lightest first (RAW: a full track escalates upward). */
export type HarmLevel = keyof CharacterHarm;

/** The ordered level list — the escalation order engine `takeHarm` walks and choice lists show. */
export const HARM_LEVELS: readonly HarmLevel[] = ['lesser', 'moderate', 'severe'];

export interface CharacterContact {
  name: string;
  description: string;
  relationship: string;
  status?: string;
}

export interface AdvancementRecord {
  id: string;
  type: string;
  description: string;
  cost: number;
  timestamp: Date;
}

export interface CreateCharacterData {
  /** The campaign to create the character inside, or omit for a standalone character (Phase 5).
   * When omitted, `rulesetId` is required so the character binds to a ruleset. */
  gameId?: string;
  /** The ruleset to bind a standalone character to (the game's ruleset is used when `gameId` is set).
   * Stored as `original_ruleset_id`. */
  rulesetId?: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  characterData: CharacterData;
  playbookType: string;
}

export interface UpdateCharacterData {
  name?: string;
  description?: string;
  avatarUrl?: string;
  characterData?: CharacterData;
  experiencePoints?: number;
  status?: CharacterStatus;
}

export interface CharacterWithDetails extends Character {
  /** `null` for a standalone character (no campaign). The `ruleset` is still resolved (from the
   * character's binding), so the sheet/validation always have a ruleset. */
  game: Game | null;
  ruleset: Ruleset;
  creator: Profile;
}

// ===========================
// VALIDATION / ADVANCEMENT CONTRACT (spoken by the rules engine + the data layer)
// ===========================

export interface CharacterAdvancement {
  type: 'attribute' | 'skill' | 'ability' | 'playbook';
  target: string;
  value?: number;
  cost: number;
  description: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string | undefined;
}
