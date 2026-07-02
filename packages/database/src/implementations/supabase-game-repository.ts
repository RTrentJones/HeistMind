// Supabase GameRepository — core tables live in the env schema; profiles live in
// `public`. `findWithDetails` therefore stitches across schemas with separate
// queries (cross-schema PostgREST embedding is unreliable).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import type {
  Game,
  GameWithDetails,
  GameState,
  CreateGameData,
  Profile,
  Result,
} from '../domain-types';
import type { GameRepository } from '../repositories';
import {
  fromSupabaseGame,
  toSupabaseGameInsert,
  toSupabaseGameUpdate,
} from '../adapters/game-adapter';
import { fromSupabaseRuleset } from '../adapters/ruleset-adapter';
import { fromSupabaseProfile } from '../adapters/profile-adapter';
import { fromSupabaseGamePlayer } from '../adapters/game-player-adapter';
import {
  failFromError,
  failFromCatch,
  NO_ROWS,
  type CoreSchema,
  coreSchema,
} from './result-helpers';

function stubProfile(id: string): Profile {
  return {
    id,
    username: null,
    displayName: null,
    avatarUrl: null,
    preferences: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export class SupabaseGameRepository implements GameRepository {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly schema: CoreSchema
  ) {}

  private get db() {
    return coreSchema(this.client, this.schema);
  }

  async create(userId: string, data: CreateGameData): Promise<Result<Game>> {
    try {
      const { data: row, error } = await this.db
        .from('games')
        .insert(toSupabaseGameInsert(data, userId))
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseGame(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async findById(id: string): Promise<Result<Game | null>> {
    try {
      const { data: row, error } = await this.db.from('games').select('*').eq('id', id).single();
      if (error) {
        if (error.code === NO_ROWS) return { success: true, data: null };
        return failFromError(error);
      }
      return { success: true, data: fromSupabaseGame(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async findByCreator(userId: string): Promise<Result<Game[]>> {
    try {
      const { data: rows, error } = await this.db
        .from('games')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseGame) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async findByPlayer(userId: string): Promise<Result<Game[]>> {
    try {
      const { data: memberships, error: mErr } = await this.db
        .from('game_players')
        .select('game_id')
        .eq('player_id', userId)
        .eq('status', 'active');
      if (mErr) return failFromError(mErr);
      const gameIds = [...new Set((memberships ?? []).map(m => m.game_id))];
      if (gameIds.length === 0) return { success: true, data: [] };
      const { data: rows, error } = await this.db
        .from('games')
        .select('*')
        .in('id', gameIds)
        .order('created_at', { ascending: false });
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseGame) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async findWithDetails(id: string): Promise<Result<GameWithDetails | null>> {
    try {
      const { data: gameRow, error } = await this.db
        .from('games')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code === NO_ROWS) return { success: true, data: null };
        return failFromError(error);
      }
      const game = fromSupabaseGame(gameRow);

      // ruleset (same schema)
      const { data: rsRow, error: rsErr } = await this.db
        .from('rulesets')
        .select('*')
        .eq('id', game.rulesetId)
        .single();
      if (rsErr) return failFromError(rsErr);

      // creator profile (public schema)
      const { data: creatorRow, error: cErr } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', game.createdBy)
        .single();
      if (cErr && cErr.code !== NO_ROWS) return failFromError(cErr);

      // players (env schema) + their profiles (public schema)
      const { data: playerRows, error: pErr } = await this.db
        .from('game_players')
        .select('*')
        .eq('game_id', id);
      if (pErr) return failFromError(pErr);

      const playerIds = [...new Set((playerRows ?? []).map(p => p.player_id))];
      const profilesById = new Map<string, Profile>();
      if (playerIds.length > 0) {
        const { data: profileRows, error: prErr } = await this.client
          .from('profiles')
          .select('*')
          .in('id', playerIds);
        if (prErr) return failFromError(prErr);
        for (const pr of profileRows ?? []) profilesById.set(pr.id, fromSupabaseProfile(pr));
      }

      const players = (playerRows ?? []).map(p => ({
        ...fromSupabaseGamePlayer(p),
        profile: profilesById.get(p.player_id) ?? stubProfile(p.player_id),
      }));

      const details: GameWithDetails = {
        ...game,
        ruleset: fromSupabaseRuleset(rsRow),
        creator: creatorRow ? fromSupabaseProfile(creatorRow) : stubProfile(game.createdBy),
        players,
        canJoin: game.state === 'recruiting' && game.currentPlayers < game.maxPlayers,
      };
      return { success: true, data: details };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async updateState(id: string, _userId: string, state: GameState): Promise<Result<Game>> {
    try {
      const { data: row, error } = await this.db
        .from('games')
        .update(toSupabaseGameUpdate({ state }))
        .eq('id', id)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseGame(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

}
