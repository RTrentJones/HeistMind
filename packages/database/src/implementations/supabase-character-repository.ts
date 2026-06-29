// Supabase CharacterRepository — core tables in the env schema, profiles in public.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
import type {
  Character,
  CharacterWithDetails,
  CreateCharacterData,
  UpdateCharacterData,
  AdvancementRecord,
  Game,
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
import { fromSupabaseProfile, toJson } from '../adapters/profile-adapter';
import {
  failFromError,
  failFromCatch,
  NO_ROWS,
  type CoreSchema,
  coreSchema,
} from './result-helpers';
import { newId } from './id';

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

export class SupabaseCharacterRepository implements CharacterRepository {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly schema: CoreSchema
  ) {}

  private get db() {
    return coreSchema(this.client, this.schema);
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

      // The creator profile is independent of the game/ruleset chain — fetch it concurrently with
      // them rather than after.
      const creatorPromise = this.client
        .from('profiles')
        .select('*')
        .eq('id', character.createdBy)
        .single();

      // Standalone characters (Phase 5) have no game; only load it when linked.
      let game: Game | null = null;
      if (character.gameId) {
        const { data: gameRow, error: gErr } = await this.db
          .from('games')
          .select('*')
          .eq('id', character.gameId)
          .single();
        if (gErr) return failFromError(gErr);
        game = fromSupabaseGame(gameRow);
      }

      // The ruleset is bound on the character (original_ruleset_id); fall back to the game's ruleset
      // for any legacy row not yet backfilled.
      const rulesetId = character.originalRulesetId ?? game?.rulesetId;
      if (!rulesetId) {
        return { success: false, error: { message: 'Character has no ruleset' } };
      }
      const { data: rsRow, error: rsErr } = await this.db
        .from('rulesets')
        .select('*')
        .eq('id', rulesetId)
        .single();
      if (rsErr) return failFromError(rsErr);

      const { data: creatorRow, error: cErr } = await creatorPromise;
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
          advancement_history: toJson(history),
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

  // Link a standalone character into a campaign (single active campaign). The RPC enforces
  // ownership + active membership + ruleset match server-side (see migration 00014).
  async attachToGame(characterId: string, gameId: string): Promise<Result<Character>> {
    try {
      const { data: row, error } = await this.db.rpc('attach_character_to_game', {
        p_character_id: characterId,
        p_game_id: gameId,
      });
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseCharacter(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  // Return a character to standalone ("My Characters"). Owner-only, enforced by the RPC.
  async detachFromGame(characterId: string): Promise<Result<Character>> {
    try {
      const { data: row, error } = await this.db.rpc('detach_character', {
        p_character_id: characterId,
      });
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseCharacter(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  // Duplicate a character into a new STANDALONE character owned by the caller (Phase 5b). Copies the
  // build verbatim (an exact snapshot, not re-validated — a played character legitimately exceeds
  // creation limits). Owner-only; the new character is bound to the same ruleset.
  async cloneCharacter(
    characterId: string,
    userId: string,
    newName?: string
  ): Promise<Result<Character>> {
    try {
      const source = await this.findById(characterId);
      if (!source.success) return source as Result<Character>;
      if (!source.data) return { success: false, error: { message: 'Character not found' } };
      if (source.data.createdBy !== userId) {
        return { success: false, error: { message: 'Not your character', code: 'FORBIDDEN' } };
      }
      const src = source.data;
      return this.create(userId, {
        rulesetId: src.originalRulesetId ?? undefined,
        name: newName ?? `${src.name} (copy)`,
        description: src.description ?? undefined,
        avatarUrl: src.avatarUrl ?? undefined,
        characterData: structuredClone(src.characterData),
        playbookType: src.playbookType,
      });
    } catch (e) {
      return failFromCatch(e);
    }
  }

  // --- Phase 5c (transfer as a distinct primitive; cross-ruleset) — not yet implemented ---
  async delete(): Promise<Result<void>> {
    throw new Error('SupabaseCharacterRepository.delete not implemented');
  }
  async transferToGame(): Promise<Result<Character>> {
    throw new Error('SupabaseCharacterRepository.transferToGame not implemented');
  }
}
