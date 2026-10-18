// Supabase CrewRepository — the one shared crew sheet per game. Stats are clamped server-side
// through the pure crew bounds (in the adapter); the DB CHECK constraints are the backstop. RLS
// restricts writes to the game's GM.
import { checkCrewProgression, clampRep } from '@heist-mind/core';
import type {
  Crew,
  CreateCrewData,
  UpdateCrewData,
  Result,
  RulesetContent,
} from '@heist-mind/core';
import { parseSupabaseJson } from '../adapters/profile-adapter';
import { fromSupabaseRuleset } from '../adapters/ruleset-adapter';
import type { CrewRepository } from '../repositories';
import {
  fromSupabaseCrew,
  toSupabaseCrewInsert,
  toSupabaseCrewUpdate,
} from '../adapters/crew-adapter';
import { failFromError } from './result-helpers';
import { SupabaseRepositoryBase } from './repository-base';

export class SupabaseCrewRepository extends SupabaseRepositoryBase implements CrewRepository {
  /** The game's crew, or null when none has been created yet. */
  async findByGame(gameId: string): Promise<Result<Crew | null>> {
    return this.run(async () => {
      const { data: row, error } = await this.db
        .from('crews')
        .select('*')
        .eq('game_id', gameId)
        .maybeSingle();
      if (error) return failFromError(error);
      return { success: true, data: row ? fromSupabaseCrew(row) : null };
    });
  }

  async create(userId: string, data: CreateCrewData): Promise<Result<Crew>> {
    return this.run(async () => {
      const { data: row, error } = await this.db
        .from('crews')
        .insert(toSupabaseCrewInsert(data, userId))
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseCrew(row) };
    });
  }

  /** The ruleset content backing a game (games.ruleset_id → rulesets.content). */
  private async rulesetForGame(gameId: string): Promise<Result<RulesetContent>> {
    const { data: game, error: gErr } = await this.db
      .from('games')
      .select('ruleset_id')
      .eq('id', gameId)
      .single();
    if (gErr) return failFromError(gErr);
    const { data: rs, error: rErr } = await this.db
      .from('rulesets')
      .select('*')
      .eq('id', game.ruleset_id)
      .single();
    if (rErr) return failFromError(rErr);
    return { success: true, data: fromSupabaseRuleset(rs).content };
  }

  /**
   * Server-side crew-ability gate (core `checkCrewProgression`): a write that ADDS a crew ability or
   * marks an upgrade box must be exactly one legal advance from the stored crew — the free creation
   * pick, or a full advancement track spent on an own-list ability (another type's only via a crew
   * Veteran slot) or on two upgrade boxes. Removals and held legacy abilities pass (grandfathered).
   * Null when the write is legal; the refusal otherwise.
   */
  private async refuseIllegalProgression(
    id: string,
    data: UpdateCrewData
  ): Promise<Result<never> | null> {
    if (data.crewAbilities === undefined && data.resources === undefined) return null;
    const { data: row, error } = await this.db.from('crews').select('*').eq('id', id).single();
    if (error) return failFromError(error);
    const prior = fromSupabaseCrew(row);
    const next = {
      crewAbilities: data.crewAbilities ?? prior.crewAbilities,
      resources: data.resources ?? prior.resources,
    };
    const added = next.crewAbilities.some(a => !prior.crewAbilities.includes(a));
    const touchesUpgrades = Object.keys(next.resources).some(k => k.startsWith('crew-upgrade:'));
    if (!added && !touchesUpgrades) return null;
    const ruleset = await this.rulesetForGame(prior.gameId);
    if (!ruleset.success) return ruleset as Result<never>;
    const check = checkCrewProgression(
      ruleset.data,
      { ...prior, crewType: data.crewType ?? prior.crewType },
      next
    );
    if (check.ok) return null;
    return { success: false, error: { message: check.message, code: check.code } };
  }

  async update(id: string, data: UpdateCrewData): Promise<Result<Crew>> {
    return this.run(async () => {
      const refused = await this.refuseIllegalProgression(id, data);
      if (refused) return refused;
      // Rep is capped at the tracker length — 12 less held turf (RAW: "12 is the max", no carry).
      // The cap depends on the claims, so a rep write reads them unless the same patch sets them.
      let patch = data;
      if (data.rep !== undefined) {
        let claims = data.claims;
        if (claims === undefined) {
          const { data: cur, error: readErr } = await this.db
            .from('crews')
            .select('claims')
            .eq('id', id)
            .single();
          if (readErr) return failFromError(readErr);
          claims = parseSupabaseJson<string[]>(cur.claims, []);
        }
        patch = { ...data, rep: clampRep(data.rep, claims) };
      }
      const { data: row, error } = await this.db
        .from('crews')
        .update(toSupabaseCrewUpdate(patch, new Date().toISOString()))
        .eq('id', id)
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseCrew(row) };
    });
  }
}
