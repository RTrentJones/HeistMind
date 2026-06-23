// HeistMind Repository Interfaces
// Database-agnostic data access contracts

import {
  Profile,
  Ruleset,
  Game,
  GamePlayer,
  Character,
  Invitation,
  CreateProfileData,
  UpdateProfileData,
  CreateRulesetData,
  UpdateRulesetData,
  CreateGameData,
  UpdateGameData,
  CreateCharacterData,
  UpdateCharacterData,
  CreateInvitationData,
  JoinGameData,
  GameWithDetails,
  CharacterWithDetails,
  RulesetWithDetails,
  UserGameContext,
  PaginatedResult,
  Result,
  DatabaseError,
  ValidationError,
  GameRole,
  PlayerStatus,
  GameState,
  RulesetStatus,
} from './domain-types';

// ===========================
// REPOSITORY INTERFACES
// ===========================

export interface ProfileRepository {
  create(data: CreateProfileData): Promise<Result<Profile>>;
  findById(id: string): Promise<Result<Profile | null>>;
  findByUsername(username: string): Promise<Result<Profile | null>>;
  update(id: string, data: UpdateProfileData): Promise<Result<Profile>>;
  delete(id: string): Promise<Result<void>>;
}

export interface RulesetRepository {
  create(userId: string, data: CreateRulesetData): Promise<Result<Ruleset>>;
  findById(id: string): Promise<Result<Ruleset | null>>;
  findByCreator(userId: string): Promise<Result<Ruleset[]>>;
  findPublic(limit?: number, cursor?: string): Promise<Result<PaginatedResult<Ruleset>>>;
  findWithDetails(id: string): Promise<Result<RulesetWithDetails | null>>;
  update(id: string, userId: string, data: UpdateRulesetData): Promise<Result<Ruleset>>;
  delete(id: string, userId: string): Promise<Result<void>>;
  searchByTags(tags: string[]): Promise<Result<Ruleset[]>>;
  checkUsage(id: string): Promise<Result<{ isUsed: boolean; gameCount: number }>>;
}

export interface GameRepository {
  create(userId: string, data: CreateGameData): Promise<Result<Game>>;
  findById(id: string): Promise<Result<Game | null>>;
  findByCreator(userId: string): Promise<Result<Game[]>>;
  findByPlayer(userId: string): Promise<Result<Game[]>>;
  findPublic(limit?: number, cursor?: string): Promise<Result<PaginatedResult<Game>>>;
  findWithDetails(id: string, userId?: string): Promise<Result<GameWithDetails | null>>;
  update(id: string, userId: string, data: UpdateGameData): Promise<Result<Game>>;
  delete(id: string, userId: string): Promise<Result<void>>;
  updateState(id: string, userId: string, state: GameState): Promise<Result<Game>>;
  canUserJoin(gameId: string, userId: string): Promise<Result<boolean>>;
}

export interface GamePlayerRepository {
  addPlayer(
    gameId: string,
    playerId: string,
    invitedBy: string,
    role?: GameRole
  ): Promise<Result<GamePlayer>>;
  removePlayer(gameId: string, playerId: string, removedBy: string): Promise<Result<void>>;
  updateRole(
    gameId: string,
    playerId: string,
    newRole: GameRole,
    updatedBy: string
  ): Promise<Result<GamePlayer>>;
  updateStatus(gameId: string, playerId: string, status: PlayerStatus): Promise<Result<GamePlayer>>;
  findByGame(gameId: string): Promise<Result<GamePlayer[]>>;
  findByPlayer(playerId: string): Promise<Result<GamePlayer[]>>;
  getUserGameContext(userId: string, gameId: string): Promise<Result<UserGameContext>>;
  isGameMaster(userId: string, gameId: string): Promise<Result<boolean>>;
}

export interface CharacterRepository {
  create(userId: string, data: CreateCharacterData): Promise<Result<Character>>;
  findById(id: string): Promise<Result<Character | null>>;
  findByGame(gameId: string): Promise<Result<Character[]>>;
  findByPlayer(userId: string): Promise<Result<Character[]>>;
  findWithDetails(id: string): Promise<Result<CharacterWithDetails | null>>;
  update(id: string, userId: string, data: UpdateCharacterData): Promise<Result<Character>>;
  delete(id: string, userId: string): Promise<Result<void>>;
  addExperience(
    id: string,
    userId: string,
    amount: number,
    reason: string
  ): Promise<Result<Character>>;
  transferToGame(
    characterId: string,
    targetGameId: string,
    userId: string
  ): Promise<Result<Character>>;
  cloneCharacter(
    characterId: string,
    targetGameId: string,
    userId: string
  ): Promise<Result<Character>>;
}

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
  cleanupExpired(): Promise<Result<number>>; // Returns count of cleaned up invitations
}

// ===========================
// AGGREGATE REPOSITORIES
// ===========================

export interface GameManagementRepository {
  createGameWithRuleset(
    userId: string,
    gameData: CreateGameData,
    rulesetData?: CreateRulesetData
  ): Promise<Result<GameWithDetails>>;
  getGameDashboard(gameId: string, userId: string): Promise<Result<GameDashboard>>;
  getPlayerDashboard(userId: string): Promise<Result<PlayerDashboard>>;
  getGameMasterDashboard(userId: string): Promise<Result<GameMasterDashboard>>;
}

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
// DASHBOARD TYPES
// ===========================

export interface GameDashboard {
  game: GameWithDetails;
  characters: Character[];
  pendingInvitations: Invitation[];
  recentActivity: Activity[];
  canManage: boolean;
}

export interface PlayerDashboard {
  activeGames: GameWithDetails[];
  characters: CharacterWithDetails[];
  pendingInvitations: Invitation[];
  recentActivity: Activity[];
}

export interface GameMasterDashboard {
  createdGames: GameWithDetails[];
  rulesets: RulesetWithDetails[];
  totalPlayers: number;
  totalCharacters: number;
  recentActivity: Activity[];
}

// ===========================
// SUPPORTING TYPES
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
  suggestion?: string;
}

export interface Activity {
  id: string;
  type:
    | 'game_created'
    | 'player_joined'
    | 'character_created'
    | 'character_advanced'
    | 'invitation_sent';
  description: string;
  userId: string;
  gameId?: string;
  characterId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// ===========================
// REPOSITORY FACTORY
// ===========================

export interface DatabaseRepositories {
  profiles: ProfileRepository;
  rulesets: RulesetRepository;
  games: GameRepository;
  gamePlayers: GamePlayerRepository;
  characters: CharacterRepository;
  invitations: InvitationRepository;
  gameManagement: GameManagementRepository;
  characterManagement: CharacterManagementRepository;
}

export interface RepositoryFactory {
  create(): Promise<DatabaseRepositories>;
  createWithTransaction(): Promise<
    DatabaseRepositories & { commit(): Promise<void>; rollback(): Promise<void> }
  >;
}

// ===========================
// QUERY OPTIONS
// ===========================

export interface QueryOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

export interface GameQueryOptions extends QueryOptions {
  state?: GameState[];
  rulesetId?: string;
  creatorId?: string;
  publicOnly?: boolean;
}

export interface RulesetQueryOptions extends QueryOptions {
  status?: RulesetStatus[];
  creatorId?: string;
  tags?: string[];
  publicOnly?: boolean;
  systemType?: string;
}

export interface CharacterQueryOptions extends QueryOptions {
  gameId?: string;
  creatorId?: string;
  playbookType?: string;
  status?: string[];
}

// ===========================
// TRANSACTION INTERFACE
// ===========================

export interface DatabaseTransaction {
  repositories: DatabaseRepositories;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

// ===========================
// DATABASE PROVIDER INTERFACE
// ===========================

export interface DatabaseProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  migrate(): Promise<void>;
  seed(): Promise<void>;
  isHealthy(): Promise<boolean>;
  createRepositories(): DatabaseRepositories;
  createAuthService(): import('./auth-types').AuthService;
  beginTransaction(): Promise<DatabaseTransaction>;
}
