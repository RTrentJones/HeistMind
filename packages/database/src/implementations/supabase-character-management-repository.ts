// Supabase CharacterManagementRepository — the server-side enforcement of character validity.
// Every create/update/advance runs the SAME pure rules as the UI (`character-rules.ts`), so a
// tampered client can't persist an illegal build. Loads the ruleset via character→game→ruleset
// (the env schema), mirroring the stitch in SupabaseCharacterRepository.findWithDetails.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../supabase-types';
import type {
  Character,
  CharacterData,
  CharacterWithDetails,
  CreateCharacterData,
  UpdateCharacterData,
  AdvancementRecord,
  RulesetContent,
  Result,
} from '../domain-types';
import type {
  CharacterManagementRepository,
  CharacterAdvancement,
  ValidationResult,
} from '../repositories';
import { fromSupabaseCharacter } from '../adapters/character-adapter';
import { fromSupabaseGame } from '../adapters/game-adapter';
import { fromSupabaseRuleset } from '../adapters/ruleset-adapter';
import { SupabaseCharacterRepository } from './supabase-character-repository';
import { validateCharacter, advancementCost } from '../character-rules';
import { failFromError, failFromCatch, type CoreSchema } from './result-helpers';

function newId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `adv-${Date.now()}-${Math.round(Math.random() * 1e9)}`
  );
}

/** A failed Result carrying the joined validation error messages. */
function failValidation<T>(result: ValidationResult): Result<T> {
  return {
    success: false,
    error: { message: result.errors.map(e => e.message).join(' '), code: 'VALIDATION' },
  };
}

export class SupabaseCharacterManagementRepository implements CharacterManagementRepository {
  private readonly characters: SupabaseCharacterRepository;

  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly schema: CoreSchema
  ) {
    this.characters = new SupabaseCharacterRepository(client, schema);
  }

  private get db() {
    return this.client.schema(this.schema as 'development');
  }

  /** Load the ruleset content backing a game (game.ruleset_id → rulesets.content). */
  private async rulesetForGame(gameId: string): Promise<Result<RulesetContent>> {
    const { data: gameRow, error: gErr } = await this.db
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();
    if (gErr) return failFromError(gErr);
    const game = fromSupabaseGame(gameRow);

    const { data: rsRow, error: rsErr } = await this.db
      .from('rulesets')
      .select('*')
      .eq('id', game.rulesetId)
      .single();
    if (rsErr) return failFromError(rsErr);
    return { success: true, data: fromSupabaseRuleset(rsRow).content };
  }

  async createCharacterWithValidation(
    userId: string,
    data: CreateCharacterData
  ): Promise<Result<CharacterWithDetails>> {
    try {
      const ruleset = await this.rulesetForGame(data.gameId);
      if (!ruleset.success) return ruleset;

      const result = validateCharacter(ruleset.data, data.characterData, { mode: 'creation' });
      if (!result.isValid) return failValidation<CharacterWithDetails>(result);

      const created = await this.characters.create(userId, data);
      if (!created.success) return created;
      return this.characters.findWithDetails(created.data.id) as Promise<
        Result<CharacterWithDetails>
      >;
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async updateCharacterWithValidation(
    characterId: string,
    userId: string,
    data: UpdateCharacterData
  ): Promise<Result<Character>> {
    try {
      const current = await this.characters.findById(characterId);
      if (!current.success) return current as Result<Character>;
      if (!current.data) return { success: false, error: { message: 'Character not found' } };

      // Validate the resulting build (live invariants: caps, prerequisites, stress/trauma bounds).
      // Point-buy/ability-count are creation-only — a played character legitimately exceeds them.
      const nextData: CharacterData = data.characterData ?? current.data.characterData;
      const ruleset = await this.rulesetForGame(current.data.gameId);
      if (!ruleset.success) return ruleset as Result<Character>;

      const result = validateCharacter(ruleset.data, nextData, { mode: 'live' });
      if (!result.isValid) return failValidation<Character>(result);

      return this.characters.update(characterId, userId, data);
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async advanceCharacter(
    characterId: string,
    _userId: string,
    adv: CharacterAdvancement
  ): Promise<Result<Character>> {
    try {
      const { data: charRow, error: readErr } = await this.db
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();
      if (readErr) return failFromError(readErr);
      const character = fromSupabaseCharacter(charRow);

      const rs = await this.rulesetForGame(character.gameId);
      if (!rs.success) return rs as Result<Character>;
      const ruleset = rs.data;

      // Cost is resolved from the ruleset (trusted over the client-supplied cost).
      const cost = advancementCost(ruleset, adv);
      if (cost > character.experiencePoints) {
        return {
          success: false,
          error: {
            message: `Not enough XP: need ${cost}, have ${character.experiencePoints}.`,
            code: 'INSUFFICIENT_XP',
          },
        };
      }

      // Requirements: each is an ability id that must currently be held.
      const option = ruleset.advancement?.advancementOptions?.find(
        o => o.id === adv.target || o.category === adv.type
      );
      const unmet = (option?.requirements ?? []).filter(
        req => !character.characterData.specialAbilities.includes(req)
      );
      if (unmet.length > 0) {
        return {
          success: false,
          error: {
            message: `Requirements not met: ${unmet.join(', ')}.`,
            code: 'REQUIREMENTS_UNMET',
          },
        };
      }

      // Apply the effect to a cloned build.
      const next: CharacterData = structuredClone(character.characterData);
      if (adv.type === 'attribute')
        next.attributes[adv.target] = (next.attributes[adv.target] ?? 0) + (adv.value ?? 1);
      else if (adv.type === 'skill')
        next.skills[adv.target] = (next.skills[adv.target] ?? 0) + (adv.value ?? 1);
      else if (adv.type === 'ability') {
        if (next.specialAbilities.includes(adv.target))
          return {
            success: false,
            error: { message: 'Ability already known.', code: 'DUPLICATE_ABILITY' },
          };
        next.specialAbilities = [...next.specialAbilities, adv.target];
      } else if (adv.type === 'playbook') {
        next.playbook = adv.target;
      }

      // Re-validate the resulting build (live invariants).
      const post = validateCharacter(ruleset, next, { mode: 'live' });
      if (!post.isValid) return failValidation<Character>(post);

      const record: AdvancementRecord = {
        id: newId(),
        type: adv.type,
        description: adv.description,
        cost, // positive = XP spent (awards use negative; see addExperience)
        timestamp: new Date(),
      };

      const { data: row, error } = await this.db
        .from('characters')
        .update({
          experience_points: character.experiencePoints - cost,
          character_data: next as unknown as Json,
          advancement_history: [...character.advancementHistory, record] as unknown as Json,
          ...(adv.type === 'playbook' ? { playbook_type: adv.target } : {}),
        })
        .eq('id', characterId)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseCharacter(row) };
    } catch (e) {
      return failFromCatch(e);
    }
  }

  async validateCharacterAgainstRuleset(characterId: string): Promise<Result<ValidationResult>> {
    try {
      const current = await this.characters.findById(characterId);
      if (!current.success) return current as Result<ValidationResult>;
      if (!current.data) return { success: false, error: { message: 'Character not found' } };

      const rs = await this.rulesetForGame(current.data.gameId);
      if (!rs.success) return rs as Result<ValidationResult>;

      // Success carries the result even when the character is invalid.
      return {
        success: true,
        data: validateCharacter(rs.data, current.data.characterData, { mode: 'live' }),
      };
    } catch (e) {
      return failFromCatch(e);
    }
  }
}
