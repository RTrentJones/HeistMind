// HeistMind Repository Interfaces
// Database-agnostic data access contracts

import {
  type Profile,
  type Ruleset,
  type Game,
  type DiscordLink,
  type GamePlayer,
  type Character,
  type Invitation,
  type Roll,
  type CreateRollData,
  type Clock,
  type CreateClockData,
  type UpdateClockData,
  type Crew,
  type CreateCrewData,
  type UpdateCrewData,
  type Faction,
  type CreateFactionData,
  type UpdateFactionData,
  type Score,
  type CreateScoreData,
  type UpdateScoreData,
  type UpdateProfileData,
  type CreateRulesetData,
  type UpdateRulesetData,
  type CreateGameData,
  type CreateCharacterData,
  type UpdateCharacterData,
  type CreateInvitationData,
  type JoinGameData,
  type GameWithDetails,
  type CharacterWithDetails,
  type Result,
  type GameRole,
  type PlayerStatus,
  type GameState,
  type CharacterAdvancement,
  type ValidationResult,
} from '@heist-mind/core';
import type { AuthService } from './auth-types';

// ===========================
// REPOSITORY INTERFACES
// ===========================

/**
 * Profiles are CREATED by the DB trigger on first (Discord OAuth) sign-in — there is deliberately
 * no client-side create. `findByUsername`/`update`/`delete` have no web caller yet; they are the
 * server contract for the Discord bot (name lookup) and future profile-editing / account-deletion
 * surfaces. `findByDiscordId` is the bot's actor resolution (one indexed query on the unique
 * `discord_id` the OAuth signup populates — no auth.admin round-trip needed).
 */
export interface ProfileRepository {
  findById(id: string): Promise<Result<Profile | null>>;
  findByUsername(username: string): Promise<Result<Profile | null>>;
  findByDiscordId(discordId: string): Promise<Result<Profile | null>>;
  update(id: string, data: UpdateProfileData): Promise<Result<Profile>>;
  delete(id: string): Promise<Result<void>>;
}

/**
 * Per-profile Discord-bot state: the ACTIVE character pointer (/character use — one at a time,
 * structural via the PK). Bot-only surface, written through the bot's service-role client; the
 * table has no anon/authenticated grants and no RLS policies.
 */
export interface DiscordPlayerRepository {
  getActiveCharacterId(profileId: string): Promise<Result<string | null>>;
  /** Upsert: first use creates the row, later uses repoint it. */
  setActiveCharacter(profileId: string, characterId: string): Promise<Result<void>>;
  clearActiveCharacter(profileId: string): Promise<Result<void>>;
}

export interface RulesetRepository {
  create(userId: string, data: CreateRulesetData): Promise<Result<Ruleset>>;
  findById(id: string): Promise<Result<Ruleset | null>>;
  findByCreator(userId: string): Promise<Result<Ruleset[]>>;
  update(id: string, userId: string, data: UpdateRulesetData): Promise<Result<Ruleset>>;
  /** Owner-only (RLS). Fails with the FK code 23503 while a campaign or one of the owner's own
   * characters still uses it (other players' characters get a private copy — 00023). */
  delete(id: string): Promise<Result<void>>;
}

export interface GameRepository {
  create(userId: string, data: CreateGameData): Promise<Result<Game>>;
  findById(id: string): Promise<Result<Game | null>>;
  findByCreator(userId: string): Promise<Result<Game[]>>;
  findByPlayer(userId: string): Promise<Result<Game[]>>;
  findWithDetails(id: string, userId?: string): Promise<Result<GameWithDetails | null>>;
  /** No web caller yet — the campaign-lifecycle contract (pause/complete) for GM tooling + the bot. */
  updateState(id: string, userId: string, state: GameState): Promise<Result<Game>>;
  /**
   * GM: set how many PLAYERS the campaign seats (the GM's seat is added on top — stored as
   * `max_players` seats, 00026). Refuses an out-of-range limit or one below the players already
   * in (`playerLimitRefusal`); the DB re-checks both (CHECK + the 00026 guard trigger).
   */
  setPlayerLimit(id: string, players: number): Promise<Result<Game>>;
  /**
   * Resolve a Discord surface to its linked campaign (bot phase 2). `candidateChannelIds` are
   * tried in precedence order (the channel, then its category); a guild-wide default link
   * (channelId NULL) is the fallback. Null = nothing linked here.
   */
  findByDiscordChannel(
    guildId: string,
    candidateChannelIds: string[]
  ): Promise<Result<Game | null>>;
  /** Set (or clear, with null) a campaign's Discord link. GM-gating happens in the bot's authz. */
  setDiscordLink(gameId: string, link: DiscordLink | null): Promise<Result<Game>>;
  /** GM-only (RLS). Attached characters return to standalone (00014 FK + the 00023 trigger). */
  delete(id: string): Promise<Result<void>>;
}

/**
 * Campaign membership. No web caller today (the web reads membership through games/characters and
 * joins via the invite RPC) — this is the SERVER surface the Discord bot builds on:
 * `isGameMaster` is the bot's authorization primitive for GM-only commands, `findByGame`/
 * `findByPlayer` resolve who is in a campaign, `addPlayer`/`updateStatus` manage membership.
 */
export interface GamePlayerRepository {
  addPlayer(
    gameId: string,
    playerId: string,
    invitedBy: string,
    role?: GameRole
  ): Promise<Result<GamePlayer>>;
  updateStatus(gameId: string, playerId: string, status: PlayerStatus): Promise<Result<GamePlayer>>;
  findByGame(gameId: string): Promise<Result<GamePlayer[]>>;
  findByPlayer(playerId: string): Promise<Result<GamePlayer[]>>;
  isGameMaster(userId: string, gameId: string): Promise<Result<boolean>>;
  /** GM-only kick (00023 RPC): status → 'removed', their characters return to standalone, and
   * `note` (if given) is logged to the campaign feed. */
  removePlayer(gameId: string, playerId: string, note?: string): Promise<Result<GamePlayer>>;
  /** The caller leaves (00023 RPC): their row is deleted, their characters return to standalone. */
  leave(gameId: string, note?: string): Promise<Result<void>>;
}

export interface CharacterRepository {
  create(userId: string, data: CreateCharacterData): Promise<Result<Character>>;
  findById(id: string): Promise<Result<Character | null>>;
  findByGame(gameId: string): Promise<Result<Character[]>>;
  findByPlayer(userId: string): Promise<Result<Character[]>>;
  findWithDetails(id: string): Promise<Result<CharacterWithDetails | null>>;
  update(id: string, userId: string, data: UpdateCharacterData): Promise<Result<Character>>;
  addExperience(
    id: string,
    userId: string,
    amount: number,
    reason: string
  ): Promise<Result<Character>>;
  /** Duplicate a character into a new STANDALONE character owned by `userId` (Phase 5b). Copies the
   * build verbatim (an exact snapshot — not re-validated). Owner-only. */
  cloneCharacter(characterId: string, userId: string, newName?: string): Promise<Result<Character>>;
  /** Link a standalone character into a campaign (single active campaign). The DB RPC enforces
   * ownership + active membership + ruleset match server-side. (Phase 5 — portable characters.) */
  attachToGame(characterId: string, gameId: string): Promise<Result<Character>>;
  /** Ids of the caller's active campaigns this character can attach to (excluding its current
   * one) — the same predicate `attachToGame` enforces, including content-identical copies of a
   * ruleset (00025). Empty for a character the caller doesn't own. */
  findAttachableGameIds(characterId: string): Promise<Result<string[]>>;
  /** Return a character to standalone ("My Characters"). Owner-only, enforced by the DB RPC. */
  detachFromGame(characterId: string): Promise<Result<Character>>;
  /** Owner-only delete (the web only offers it to the owner). The feed keeps its entries. */
  delete(id: string): Promise<Result<void>>;
}

/**
 * Invitations. The web uses `create`/`findByGame` (GM join codes) and `joinViaCode` (redeem).
 * `findByCode` (the bot's `/join <code>` lookup), `findById`/`findByPlayer`, and the targeted
 * `accept`/`decline`/`revoke` flow are implemented server surface for the bot + invite management.
 */
export interface InvitationRepository {
  create(userId: string, data: CreateInvitationData): Promise<Result<Invitation>>;
  findById(id: string): Promise<Result<Invitation | null>>;
  findByGame(gameId: string): Promise<Result<Invitation[]>>;
  findByPlayer(userId: string): Promise<Result<Invitation[]>>;
  findByCode(inviteCode: string): Promise<Result<Invitation | null>>;
  accept(invitationId: string, userId: string): Promise<Result<GamePlayer>>;
  decline(invitationId: string, userId: string): Promise<Result<Invitation>>;
  revoke(invitationId: string, userId: string): Promise<Result<Invitation>>;
  joinViaCode(data: JoinGameData, userId: string): Promise<Result<GamePlayer>>;
}

// ===========================
// AGGREGATE REPOSITORIES
// ===========================

export interface CharacterManagementRepository {
  createCharacterWithValidation(
    userId: string,
    data: CreateCharacterData
  ): Promise<Result<CharacterWithDetails>>;
  updateCharacterWithValidation(
    characterId: string,
    userId: string,
    data: UpdateCharacterData
  ): Promise<Result<Character>>;
  advanceCharacter(
    characterId: string,
    userId: string,
    advancementData: CharacterAdvancement
  ): Promise<Result<Character>>;
  validateCharacterAgainstRuleset(characterId: string): Promise<Result<ValidationResult>>;
}

// ===========================
// REPOSITORY FACTORY
// ===========================

/** Append-only dice-roll log, scoped per game (the play-by-post centerpiece). */
/** What `chargeAssistStress` did: +1 stress written, or held back at the last box (00027). */
export type AssistCharge = 'charged' | 'near_limit';

export interface RollRepository {
  create(userId: string, data: CreateRollData): Promise<Result<Roll>>;
  findByGame(gameId: string, limit?: number): Promise<Result<Roll[]>>;
  /**
   * Charge an ASSIST's 1 stress to ANOTHER player's character (00027 `charge_assist_stress`, the
   * one narrow cross-player write): only for the caller's own action roll from the last 15
   * minutes, once per roll, and only while +1 stays below the ruleset's base stress max —
   * otherwise `near_limit` (nothing written; the owner marks it, trauma is their call). Logs a
   * note row (`note`) for the helper's character.
   */
  chargeAssistStress(
    rollId: string,
    characterId: string,
    note: string
  ): Promise<Result<AssistCharge>>;
}

/** Per-game progress clocks. Members read; the game's GM creates / ticks / removes them. */
export interface ClockRepository {
  create(userId: string, data: CreateClockData): Promise<Result<Clock>>;
  findByGame(gameId: string): Promise<Result<Clock[]>>;
  update(id: string, data: UpdateClockData): Promise<Result<Clock>>;
  delete(id: string): Promise<Result<void>>;
}

/** The one shared crew sheet per game. Members read; the game's GM maintains it. */
export interface CrewRepository {
  findByGame(gameId: string): Promise<Result<Crew | null>>;
  create(userId: string, data: CreateCrewData): Promise<Result<Crew>>;
  update(id: string, data: UpdateCrewData): Promise<Result<Crew>>;
}

/** Per-game factions + status. Members read; the game's GM maintains them. */
export interface FactionRepository {
  findByGame(gameId: string): Promise<Result<Faction[]>>;
  create(userId: string, data: CreateFactionData): Promise<Result<Faction>>;
  update(id: string, data: UpdateFactionData): Promise<Result<Faction>>;
  delete(id: string): Promise<Result<void>>;
}

/** Per-game scores / operations. Members read; the GM runs the lifecycle (one active at a time). */
export interface ScoreRepository {
  findByGame(gameId: string): Promise<Result<Score[]>>;
  findActive(gameId: string): Promise<Result<Score | null>>;
  start(userId: string, data: CreateScoreData): Promise<Result<Score>>;
  end(id: string): Promise<Result<Score>>;
  update(id: string, data: UpdateScoreData): Promise<Result<Score>>;
}

export interface DatabaseRepositories {
  profiles: ProfileRepository;
  rulesets: RulesetRepository;
  games: GameRepository;
  gamePlayers: GamePlayerRepository;
  characters: CharacterRepository;
  invitations: InvitationRepository;
  rolls: RollRepository;
  clocks: ClockRepository;
  crews: CrewRepository;
  factions: FactionRepository;
  scores: ScoreRepository;
  characterManagement: CharacterManagementRepository;
  discordPlayers: DiscordPlayerRepository;
}

// ===========================
// DATABASE PROVIDER INTERFACE
// ===========================

export interface DatabaseProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isHealthy(): Promise<boolean>;
  createRepositories(): DatabaseRepositories;
  createAuthService(): AuthService;
}
