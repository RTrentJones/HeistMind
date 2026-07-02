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
  preferences: Record<string, unknown>;
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
  compatibilityFlags: Record<string, unknown>;
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
  ruleOverrides: Record<string, unknown>;
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
  permissions: Record<string, unknown>;
  invitedAt: Date;
  joinedAt: Date | null;
  leftAt: Date | null;
}

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
  /** The score / operation this event belongs to (the feed groups by it); null if outside a score. */
  scoreId: string | null;
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
  /**
   * The score to tag this event with. Omit (undefined) to let the repository auto-tag the campaign's
   * active score; pass an explicit id (e.g. a score's own start/end event) or null to skip tagging.
   */
  scoreId?: string | null;
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
  /**
   * The named trauma conditions a character may take (BitD's 8: Cold, Haunted, Obsessed, Paranoid,
   * Reckless, Soft, Unstable, Vicious — or a reskinned set). When present, `validateCharacter`
   * enforces that each marked trauma is one of these; when absent, trauma is count-only (lenient).
   */
  traumaConditions?: string[];
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
  /**
   * Optional structured effects this crew ability grants to EVERY member (see {@link AbilityEffects}):
   * "Deadly" → `{ bonusActionDots: 1 }`, "Mastery" → `{ actionMax: 4 }`, a veteran-granting upgrade →
   * `{ veteran: 1 }`. Applied by `validateCharacter` when crew context is supplied.
   */
  effects?: AbilityEffects;
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

/**
 * Structured mechanical effects an ability grants, so the validator can apply them instead of the
 * effect living only in prose `rules`. Used by both character special abilities (e.g. BitD "Mule"
 * raising load) and crew abilities (e.g. "Deadly" granting a member dot, "Mastery" raising the action
 * cap). Effective bounds = base ⊕ a character's own ability effects ⊕ its crew's ability effects.
 */
export interface AbilityEffects {
  /** Override/raise the load capacity per level (e.g. Mule: `{ light: 4, normal: 6, heavy: 9 }`). */
  loadCapacity?: Partial<Record<LoadLevel, number>>;
  /** Raise the per-action rating cap (BitD crew "Mastery": 4). Highest wins. */
  actionMax?: number;
  /** Extra free action dots the member may place (BitD crew "Deadly": 1). Summed across abilities. */
  bonusActionDots?: number;
  /** Grant N cross-playbook ("veteran") ability picks, opening tier-2 abilities outside the roster. */
  veteran?: number;
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
  /** Optional structured effects applied by the validator (see {@link AbilityEffects}). */
  effects?: AbilityEffects;
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
  value?: unknown;
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
  value: unknown;
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

// ===========================
// INPUT/OUTPUT TYPES
// ===========================

export interface UpdateProfileData {
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  preferences?: Record<string, unknown>;
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
  ruleOverrides?: Record<string, unknown>;
  houseRules?: string;
  inviteOnly?: boolean;
  publicListing?: boolean;
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
  /** `null` for a standalone character (no campaign). The `ruleset` is still resolved (from the
   * character's binding), so the sheet/validation always have a ruleset. */
  game: Game | null;
  ruleset: Ruleset;
  creator: Profile;
}

// ===========================
// ERROR TYPES
// ===========================

export interface DatabaseError {
  message: string;
  code?: string | undefined;
  details?: string | undefined;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export type Result<T, E = DatabaseError> =
  | { success: true; data: T }
  | { success: false; error: E };
