// A campaign and its membership.
import type { Profile } from './profile';
import type { Ruleset } from './ruleset';

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

export type GameState = 'draft' | 'recruiting' | 'active' | 'paused' | 'completed';

export type GameRole = 'game_master' | 'player' | 'co_gm' | 'spectator';

export type PlayerStatus = 'invited' | 'active' | 'inactive' | 'removed';

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

export interface GameWithDetails extends Game {
  ruleset: Ruleset;
  creator: Profile;
  players: Array<GamePlayer & { profile: Profile }>;
  canJoin: boolean;
}
