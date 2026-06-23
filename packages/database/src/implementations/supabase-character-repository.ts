// Supabase CharacterRepository — core tables in the env schema, profiles in public.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../supabase-types';
import type {
  Character,
  CharacterWithDetails,
  CreateCharacterData,
  UpdateCharacterData,
  AdvancementRecord,
  Profile,
  Result,
} from '../domain-types';
import type { CharacterRepository } from '../repositories';
import {
  fromSupabaseCharacter,
  toSupabaseCharacterInsert,
  toSupabaseCharacterUpdate,
} from '../adapters/character-adapter';
import { fromSupabaseGame } from '../adapters/game-adapter';
import { fromSupabaseRuleset } from '../adapters/ruleset-adapter';
import { fromSupabaseProfile } from '../adapters/profile-adapter';
import { failFromError, failFromCatch, NO_ROWS, type CoreSchema } from './result-helpers';

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

function newId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `adv-${Date.now()}-${Math.round(Math.random() * 1e9)}`
  );
}

export class SupabaseCharacterRepository implements CharacterRepository {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly schema: CoreSchema
  ) {}

  private get db() {
    return this.client.schema(this.schema as 'development');
  }

  async create(userId: string, data: CreateCharacterData): Promise<Result<Character>> {
    try {
      const { data: row, error } = await this.db
        .from('characters')
        .insert(toSupabaseCharacterInsert(data, userId))
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseCharacter(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async findById(id: string): Promise<Result<Character | null>> {
    try {
      const { data: row, error } = await this.db
        .from('characters')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code === NO_ROWS) return { success: true, data: null };
        return failFromError(error);
      }
      return { success: true, data: fromSupabaseCharacter(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async findByGame(gameId: string): Promise<Result<Character[]>> {
    try {
      const { data: rows, error } = await this.db
        .from('characters')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: false });
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseCharacter) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async findByPlayer(userId: string): Promise<Result<Character[]>> {
    try {
      const { data: rows, error } = await this.db
        .from('characters')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseCharacter) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async findWithDetails(id: string): Promise<Result<CharacterWithDetails | null>> {
    try {
      const { data: charRow, error } = await this.db
        .from('characters')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code === NO_ROWS) return { success: true, data: null };
        return failFromError(error);
      }
      const character = fromSupabaseCharacter(charRow);

      const { data: gameRow, error: gErr } = await this.db
        .from('games')
        .select('*')
        .eq('id', character.gameId)
        .single();
      if (gErr) return failFromError(gErr);
      const game = fromSupabaseGame(gameRow);

      const { data: rsRow, error: rsErr } = await this.db
        .from('rulesets')
        .select('*')
        .eq('id', game.rulesetId)
        .single();
      if (rsErr) return failFromError(rsErr);

      const { data: creatorRow, error: cErr } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', character.createdBy)
        .single();
      if (cErr && cErr.code !== NO_ROWS) return failFromError(cErr);

      const details: CharacterWithDetails = {
        ...character,
        game,
        ruleset: fromSupabaseRuleset(rsRow),
        creator: creatorRow ? fromSupabaseProfile(creatorRow) : stubProfile(character.createdBy),
      };
      return { success: true, data: details };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async update(id: string, _userId: string, data: UpdateCharacterData): Promise<Result<Character>> {
    try {
      const { data: row, error } = await this.db
        .from('characters')
        .update(toSupabaseCharacterUpdate(data))
        .eq('id', id)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseCharacter(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async addExperience(
    id: string,
    _userId: string,
    amount: number,
    reason: string
  ): Promise<Result<Character>> {
    try {
      const { data: charRow, error: readErr } = await this.db
        .from('characters')
        .select('*')
        .eq('id', id)
        .single();
      if (readErr) return failFromError(readErr);
      const character = fromSupabaseCharacter(charRow);

      const record: AdvancementRecord = {
        id: newId(),
        type: 'experience',
        description: reason,
        cost: -Math.abs(amount),
        timestamp: new Date(),
      };
      const history = [...character.advancementHistory, record];

      const { data: row, error } = await this.db
        .from('characters')
        .update({
          experience_points: character.experiencePoints + amount,
          advancement_history: history as unknown as Json,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseCharacter(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  // --- Outside the journey scope ---
  async delete(): Promise<Result<void>> {
    throw new Error('SupabaseCharacterRepository.delete not implemented');
  }
  async transferToGame(): Promise<Result<Character>> {
    throw new Error('SupabaseCharacterRepository.transferToGame not implemented');
  }
  async cloneCharacter(): Promise<Result<Character>> {
    throw new Error('SupabaseCharacterRepository.cloneCharacter not implemented');
  }
}
