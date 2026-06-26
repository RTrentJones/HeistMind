// HeistMind Domain Types
// Database-agnostic types for application use

import type { RollKind, RollOutcome } from './dice';

// ===========================
// CORE DOMAIN ENTITIES
// ===========================

export interface Profile {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  preferences: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Ruleset {
  id: string;
  createdBy: string;
  name: string;
  description: string | null;
  version: string;
  content: RulesetContent;
  schemaVersion: string;
  sourceFileUrl: string | null;
  backupFileUrl: string | null;
  status: RulesetStatus;
  isPublic: boolean;
  tags: string[];
  compatibilityFlags: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Game {
  id: string;
  createdBy: string;
  rulesetId: string;
  name: string;
  description: string | null;
  state: GameState;
  maxPlayers: number;
  currentPlayers: number;
  allowCoGMs: boolean;
  allowSpectators: boolean;
  ruleOverrides: Record<string, any>;
  houseRules: string | null;
  inviteOnly: boolean;
  publicListing: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GamePlayer {
  id: string;
  gameId: string;
  playerId: string;
  role: GameRole;
  status: PlayerStatus;
  permissions: Record<string, any>;
  invitedAt: Date;
  joinedAt: Date | null;
  leftAt: Date | null;
}

export interface Character {
  id: string;
  createdBy: string;
  gameId: string;
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
  adaptations: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/** A persisted dice roll — the per-game, play-by-post roll log. */
export interface Roll {
  id: string;
  gameId: string;
  characterId: string | null;
  userId: string;
  kind: RollKind;
  label: string | null;
  dice: number;
  results: number[];
  outcome: RollOutcome;
  position: string | null;
  effect: string | null;
  note: string | null;
  createdAt: Date;
}

export interface CreateRollData {
  gameId: string;
  characterId?: string;
  kind: RollKind;
  label?: string;
  dice: number;
  results: number[];
  /** When true the roll took the LOWEST of the dice (rating 0); drives the outcome recompute. */
  zeroDice?: boolean;
  position?: string;
  effect?: string;
  note?: string;
}

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

export interface Invitation {
  id: string;
  gameId: string;
  invitedBy: string;
  invitedPlayer: string | null;
  inviteCode: string | null;
  expiresAt: Date | null;
  maxUses: number;
  usedCount: number;
  status: InvitationStatus;
  createdAt: Date;
  respondedAt: Date | null;
}

// ===========================
// ENUMS
// ===========================

export type RulesetStatus = 'draft' | 'published' | 'archived';
export type GameState = 'draft' | 'recruiting' | 'active' | 'paused' | 'completed';
export type GameRole = 'game_master' | 'player' | 'co_gm' | 'spectator';
export type PlayerStatus = 'invited' | 'active' | 'inactive' | 'removed';
export type CharacterStatus = 'active' | 'inactive' | 'retired' | 'dead';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';

// ===========================
// COMPLEX DATA STRUCTURES
// ===========================

export interface RulesetContent {
  metadata: {
    name: string;
    version: string;
    author: string;
    description: string;
    system: string;
  };
  playbooks: PlaybookDefinition[];
  attributes: AttributeDefinition[];
  skills: SkillDefinition[];
  specialAbilities: AbilityDefinition[];
  equipment: EquipmentRules;
  advancement: AdvancementRules;
  characterCreation: CreationRules;
  /** Stress/trauma bounds. Optional; defaults to BitD `{ max: 9, traumaMax: 4 }` when absent. */
  stress?: StressRules;
  /** Harm-track box counts per level. Optional; defaults to BitD `{ lesser:2, moderate:2, severe:1 }`. */
  harm?: HarmRules;
  /** Optional crew-sheet content (crew types, crew abilities, available claims). */
  crew?: CrewRules;
  /** Optional suggested factions the GM can seed into a campaign. */
  factions?: FactionDefinition[];
}

/** A ruleset-suggested faction (the GM can add it to a campaign with one click). */
export interface FactionDefinition {
  name: string;
  type?: string;
  tier?: number;
  description?: string;
}

/** Ruleset-level crew content: the types a crew can be, the crew abilities, and available claims. */
export interface CrewRules {
  types: CrewTypeDefinition[];
  abilities: CrewAbilityDefinition[];
  claims?: string[];
  /**
   * Optional named resource tracks on the crew sheet (e.g. Scum & Villainy "gambits", a Wicked Ones
   * dungeon hoard, squad supplies). Absent for BitD/Brackwater-style crews, which render unchanged.
   */
  resourcePools?: CrewResourcePool[];
}

/** A named crew-level resource track (gambits / hoard / supplies). All optional, additive content. */
export interface CrewResourcePool {
  id: string;
  name: string;
  description?: string;
  /** Track ceiling. */
  max: number;
  /** Starting value for a fresh crew (defaults to 0). */
  startsAt?: number;
}

export interface CrewTypeDefinition {
  id: string;
  name: string;
  description: string;
}

export interface CrewAbilityDefinition {
  id: string;
  name: string;
  description: string;
  /** Which crew type this ability belongs to (optional — shared abilities omit it). */
  crewType?: string;
}

export interface StressRules {
  max: number;
  traumaMax: number;
}

export interface HarmRules {
  lesser: number;
  moderate: number;
  severe: number;
}

export interface PlaybookDefinition {
  id: string;
  name: string;
  description: string;
  startingAbilities: string[];
  specialAbilities: string[];
  contacts: ContactDefinition[];
  equipment: string[];
  attributes: Record<string, number>;
  skills: Record<string, number>;
}

export interface AttributeDefinition {
  id: string;
  name: string;
  description: string;
  skills: string[];
  defaultValue?: number;
  maxValue?: number;
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  attribute: string;
  examples?: string[];
}

export interface AbilityDefinition {
  id: string;
  name: string;
  /** A short, evocative one-liner (shown on cards). */
  description: string;
  /** Full, resolvable rules text — the exact mechanical effect (shown in an expandable detail). */
  rules?: string;
  prerequisite?: string;
  tier?: number;
  category?: string;
}

export interface ContactDefinition {
  name: string;
  description: string;
  relationship?: string;
}

export interface EquipmentRules {
  loadCapacity: Record<string, number>;
  items: EquipmentItem[];
  categories: EquipmentCategory[];
}

export interface EquipmentItem {
  id: string;
  name: string;
  description: string;
  load: number;
  category: string;
  quality?: number;
}

export interface EquipmentCategory {
  id: string;
  name: string;
  description: string;
  defaultItems?: string[];
}

export interface AdvancementRules {
  xpTriggers: XPTrigger[];
  advancementOptions: AdvancementOption[];
  playbookAdvancement?: PlaybookAdvancement[];
  /**
   * Opt-in: model advancement as BitD-style XP tracks rather than a flat XP pool. When present,
   * the character marks XP into per-attribute tracks + a playbook track; an advancement is gated
   * on its track being full (then the track is cleared) instead of on spending pooled XP.
   */
  xpTracks?: XpTrackRules;
}

export interface XpTrackRules {
  /** Boxes in the playbook XP track (BitD: 8) — fills to unlock an ability/playbook advance. */
  playbook: number;
  /** Boxes in each attribute XP track (BitD: 6) — fills to unlock an action-dot/attribute advance. */
  attribute: number;
}

export interface XPTrigger {
  id: string;
  name: string;
  description: string;
  value: number;
}

export interface AdvancementOption {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: 'attribute' | 'skill' | 'ability' | 'playbook';
  requirements?: string[];
}

export interface PlaybookAdvancement {
  playbookId: string;
  specialOptions: AdvancementOption[];
}

export interface CreationRules {
  steps: CreationStep[];
  pointBuy?: PointBuyRules;
  restrictions?: CreationRestriction[];
  /**
   * How many special abilities a character may choose at creation (counts the playbook's
   * seeded `startingAbilities`). Defaults to `playbook.startingAbilities.length`, else 1.
   */
  abilityChoices?: number;
  /**
   * Opt-in: rate the individual ACTIONS (the entries in each `AttributeDefinition.skills`)
   * 0..`max`, stored in `CharacterData.skills`; attributes become DERIVED (count of an
   * attribute's actions rated ≥ 1). When present the wizard/engine use action-rating mode;
   * when absent they fall back to attribute point-buy (`pointBuy`).
   */
  actionRatings?: ActionRatingRules;
}

export interface ActionRatingRules {
  /** Action dots to assign at creation, on top of the playbook's seeded starting dots. */
  points: number;
  /** Max rating any single action may have at creation (BitD: 2). */
  maxAtCreation: number;
  /** Absolute cap on an action rating (BitD: 3). Defaults to the attribute's maxValue or 3. */
  max?: number;
}

export interface CreationStep {
  id: string;
  name: string;
  description: string;
  order: number;
  required: boolean;
  options?: CreationOption[];
}

export interface CreationOption {
  id: string;
  name: string;
  description: string;
  value?: any;
  cost?: number;
}

export interface PointBuyRules {
  totalPoints: number;
  attributeCosts: Record<number, number>;
  skillCosts: Record<number, number>;
}

export interface CreationRestriction {
  field: string;
  condition: string;
  value: any;
  message: string;
}

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
  custom: Record<string, any>;
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
}

export interface CharacterHarm {
  /** Level 1 — lesser harm (reduced effect). */
  lesser: string[];
  /** Level 2 — moderate harm (reduced effect / -1d). */
  moderate: string[];
  /** Level 3 — severe harm (need help to act). */
  severe: string[];
}

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

// ===========================
// BUSINESS LOGIC TYPES
// ===========================

export interface UserGameContext {
  userId: string;
  gameId: string;
  role: GameRole | 'none';
  status: PlayerStatus | 'none';
  permissions: GamePermissions;
}

export interface GamePermissions {
  canViewGame: boolean;
  canEditGame: boolean;
  canInvitePlayers: boolean;
  canCreateCharacters: boolean;
  canEditOwnCharacters: boolean;
  canEditAllCharacters: boolean;
  canViewAllCharacters: boolean;
  canManageInvitations: boolean;
  canPromoteToCoGM: boolean;
}

// ===========================
// INPUT/OUTPUT TYPES
// ===========================

export interface CreateProfileData {
  username: string;
  displayName?: string;
  avatarUrl?: string;
  preferences?: Record<string, any>;
}

export interface UpdateProfileData {
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  preferences?: Record<string, any>;
}

export interface CreateRulesetData {
  name: string;
  description?: string;
  version: string;
  content: RulesetContent;
  isPublic?: boolean;
  tags?: string[];
  sourceFileUrl?: string;
}

export interface UpdateRulesetData {
  name?: string;
  description?: string;
  version?: string;
  content?: RulesetContent;
  status?: RulesetStatus;
  isPublic?: boolean;
  tags?: string[];
}

export interface CreateGameData {
  rulesetId: string;
  name: string;
  description?: string;
  maxPlayers?: number;
  allowCoGMs?: boolean;
  allowSpectators?: boolean;
  inviteOnly?: boolean;
  publicListing?: boolean;
  houseRules?: string;
}

export interface UpdateGameData {
  name?: string;
  description?: string;
  state?: GameState;
  maxPlayers?: number;
  allowCoGMs?: boolean;
  allowSpectators?: boolean;
  ruleOverrides?: Record<string, any>;
  houseRules?: string;
  inviteOnly?: boolean;
  publicListing?: boolean;
}

export interface CreateCharacterData {
  gameId: string;
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

export interface CreateInvitationData {
  gameId: string;
  invitedPlayer?: string;
  inviteCode?: string;
  expiresAt?: Date;
  maxUses?: number;
}

export interface JoinGameData {
  gameId: string;
  invitationId?: string;
  inviteCode?: string;
}

// ===========================
// QUERY RESULT TYPES
// ===========================

export interface GameWithDetails extends Game {
  ruleset: Ruleset;
  creator: Profile;
  players: Array<GamePlayer & { profile: Profile }>;
  canJoin: boolean;
}

export interface CharacterWithDetails extends Character {
  game: Game;
  ruleset: Ruleset;
  creator: Profile;
}

export interface RulesetWithDetails extends Ruleset {
  creator: Profile;
  gameCount: number;
  isUsed: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  hasMore: boolean;
  nextCursor?: string;
}

// ===========================
// ERROR TYPES
// ===========================

export interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export type Result<T, E = DatabaseError> =
  | { success: true; data: T }
  | { success: false; error: E };
