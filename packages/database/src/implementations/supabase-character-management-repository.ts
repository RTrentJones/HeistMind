// Supabase CharacterManagementRepository — the server-side enforcement of character validity.
// Every create/update/advance runs the SAME pure rules as the UI (`character-rules.ts`), so a
// tampered client can't persist an illegal build. Loads the ruleset via character→game→ruleset
// (the env schema), mirroring the stitch in SupabaseCharacterRepository.findWithDetails.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase-types';
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
import { toJson } from '../adapters/profile-adapter';
import { SupabaseCharacterRepository } from './supabase-character-repository';
import {
  validateCharacter,
  advancementCost,
  usesXpTracks,
  xpTrackFull,
  advanceTrack,
  clearXpTrack,
  PLAYBOOK_TRACK,
  type CrewContext,
} from '../character-rules';
import { failFromError, failFromCatch, type CoreSchema, coreSchema } from './result-helpers';
import { newId } from './id';

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
    return coreSchema(this.client, this.schema);
  }

  /** Load ruleset content by id (rulesets.content). */
  private async rulesetContentById(rulesetId: string): Promise<Result<RulesetContent>> {
    const { data: rsRow, error } = await this.db
      .from('rulesets')
      .select('*')
      .eq('id', rulesetId)
      .single();
    if (error) return failFromError(error);
    return { success: true, data: fromSupabaseRuleset(rsRow).content };
  }

  /** Load the ruleset content backing a game (game.ruleset_id → rulesets.content). */
  private async rulesetForGame(gameId: string): Promise<Result<RulesetContent>> {
    const { data: gameRow, error: gErr } = await this.db
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();
    if (gErr) return failFromError(gErr);
    return this.rulesetContentById(fromSupabaseGame(gameRow).rulesetId);
  }

  /**
   * The ruleset content for an EXISTING character — resolved via its binding
   * (`original_ruleset_id`), falling back to its game for any legacy row not yet backfilled. Works
   * for standalone characters (Phase 5), which have no game.
   */
  private async rulesetForCharacter(character: Character): Promise<Result<RulesetContent>> {
    if (character.originalRulesetId) return this.rulesetContentById(character.originalRulesetId);
    if (character.gameId) return this.rulesetForGame(character.gameId);
    return { success: false, error: { message: 'Character has no ruleset' } };
  }

  /**
   * Resolve the ruleset + crew context for CREATING a character: from the game (in-campaign) or
   * directly from a ruleset (standalone). Standalone has no crew context.
   */
  private async resolveCreationContext(
    data: CreateCharacterData
  ): Promise<Result<{ rulesetId: string; content: RulesetContent; crew: CrewContext | null }>> {
    if (data.gameId) {
      const { data: gameRow, error: gErr } = await this.db
        .from('games')
        .select('*')
        .eq('id', data.gameId)
        .single();
      if (gErr) return failFromError(gErr);
      const game = fromSupabaseGame(gameRow);
      const content = await this.rulesetContentById(game.rulesetId);
      if (!content.success) return content as Result<never>;
      const crew = await this.crewForGame(data.gameId);
      return { success: true, data: { rulesetId: game.rulesetId, content: content.data, crew } };
    }
    if (data.rulesetId) {
      const content = await this.rulesetContentById(data.rulesetId);
      if (!content.success) return content as Result<never>;
      return {
        success: true,
        data: { rulesetId: data.rulesetId, content: content.data, crew: null },
      };
    }
    return { success: false, error: { message: 'A character needs a campaign or a ruleset.' } };
  }

  /**
   * The campaign's crew context (its held abilities) for crew-aware validation — Mastery raises the
   * action cap, Deadly grants a bonus dot, a veteran upgrade opens cross-playbook abilities. Null
   * when the campaign has no crew yet (the character then validates against the ruleset alone).
   */
  private async crewForGame(gameId: string): Promise<CrewContext | null> {
    const { data } = await this.db
      .from('crews')
      .select('crew_abilities')
      .eq('game_id', gameId)
      .maybeSingle();
    return data ? { crewAbilities: (data.crew_abilities as string[] | null) ?? [] } : null;
  }

  async createCharacterWithValidation(
    userId: string,
    data: CreateCharacterData
  ): Promise<Result<CharacterWithDetails>> {
    try {
      const ctx = await this.resolveCreationContext(data);
      if (!ctx.success) return ctx as Result<CharacterWithDetails>;

      const result = validateCharacter(ctx.data.content, data.characterData, {
        mode: 'creation',
        crew: ctx.data.crew,
      });
      if (!result.isValid) return failValidation<CharacterWithDetails>(result);

      // Bind the resolved ruleset on the character (original_ruleset_id), so a standalone character
      // and an in-campaign one both carry their ruleset.
      const created = await this.characters.create(userId, {
        ...data,
        rulesetId: ctx.data.rulesetId,
      });
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
      const ruleset = await this.rulesetForCharacter(current.data);
      if (!ruleset.success) return ruleset as Result<Character>;

      const crew = current.data.gameId ? await this.crewForGame(current.data.gameId) : null;
      const result = validateCharacter(ruleset.data, nextData, { mode: 'live', crew });
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

      const rs = await this.rulesetForCharacter(character);
      if (!rs.success) return rs as Result<Character>;
      const ruleset = rs.data;

      // Two advancement economies. XP-track rulesets gate on a FULL track (then clear it); flat-pool
      // rulesets gate on having enough pooled XP (then subtract the ruleset-resolved cost).
      const trackMode = usesXpTracks(ruleset);
      const track = advanceTrack(ruleset, adv);
      const cost = advancementCost(ruleset, adv);
      if (trackMode) {
        if (!xpTrackFull(ruleset, character.characterData, track)) {
          const label = track === PLAYBOOK_TRACK ? 'playbook' : track;
          return {
            success: false,
            error: {
              message: `The ${label} XP track isn't full yet.`,
              code: 'XP_TRACK_NOT_FULL',
            },
          };
        }
      } else if (cost > character.experiencePoints) {
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

      // The campaign's crew gates what an advance may take (a veteran upgrade opens cross-playbook
      // picks) and raises the bounds the result is validated against (Mastery/Deadly/Mule). A
      // standalone character (no game) advances against the ruleset alone.
      const crew = character.gameId ? await this.crewForGame(character.gameId) : null;

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
        // Advancement is the BitD "veteran" path: a played character may reach beyond its starting
        // playbook (subject to the option's own `requirements`/prereqs, checked above). So we don't
        // re-apply creation's roster/tier gate here — crew context instead RAISES the live bounds the
        // result is validated against (Mastery action cap, Deadly dots, Mule load) just below.
        next.specialAbilities = [...next.specialAbilities, adv.target];
      } else if (adv.type === 'playbook') {
        next.playbook = adv.target;
      }

      // Track-mode advances spend a full track: clear it (no pooled XP changes hands).
      if (trackMode) next.xp = clearXpTrack(next, track);

      // Re-validate the resulting build (live invariants), in the crew's context.
      const post = validateCharacter(ruleset, next, { mode: 'live', crew });
      if (!post.isValid) return failValidation<Character>(post);

      const record: AdvancementRecord = {
        id: newId(),
        type: adv.type,
        description: adv.description,
        cost: trackMode ? 0 : cost, // positive = pooled XP spent (awards use negative; see addExperience)
        timestamp: new Date(),
      };

      const { data: row, error } = await this.db
        .from('characters')
        .update({
          ...(trackMode ? {} : { experience_points: character.experiencePoints - cost }),
          character_data: toJson(next),
          advancement_history: toJson([...character.advancementHistory, record]),
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

      const rs = await this.rulesetForCharacter(current.data);
      if (!rs.success) return rs as Result<ValidationResult>;

      const crew = current.data.gameId ? await this.crewForGame(current.data.gameId) : null;
      // Success carries the result even when the character is invalid.
      return {
        success: true,
        data: validateCharacter(rs.data, current.data.characterData, { mode: 'live', crew }),
      };
    } catch (e) {
      return failFromCatch(e);
    }
  }
}
