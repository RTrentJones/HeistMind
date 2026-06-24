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
  description: string;
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
  coins: number;
  contacts: CharacterContact[];
  custom: Record<string, any>;
}

export interface CharacterItem {
  id: string;
  name: string;
  description?: string;
  load?: number;
  quality?: number;
  equipped: boolean;
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
