// Supabase CrewRepository — the one shared crew sheet per game. Stats are clamped server-side
// through the pure crew bounds (in the adapter); the DB CHECK constraints are the backstop. RLS
// restricts writes to the game's GM.
import {
  CREW_STARTING_PICK_KEY,
  checkCrewProgression,
  clampRep,
  withCrewStartingPickSpent,
} from '@heist-mind/core';
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

/** `data` whose resources carry the starting-pick latch (core `withCrewStartingPickSpent`). */
function latchedPatch(
  ruleset: RulesetContent | null,
  prior: Crew,
  data: UpdateCrewData,
  resources: Record<string, number>
): UpdateCrewData {
  const latched = withCrewStartingPickSpent(ruleset, prior, resources);
  return latched === resources ? data : { ...data, resources: latched };
}

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
   * Crew-ability gate (core `checkCrewProgression`) — server-side for the bot's writes, but it runs
   * in the browser for the web's (RLS lets the GM update any crew column directly; F100). A write that ADDS a crew ability or
   * marks an upgrade box must be exactly one legal advance from the stored crew — the free creation
   * pick, or a full advancement track spent on an own-list ability (another type's only via a crew
   * Veteran slot) or on two upgrade boxes. Removals and held legacy abilities pass (grandfathered).
   *
   * Every ability/resources write also carries the free-starting-pick latch forward (round 4
   * P2-N9: removing every ability used to re-open the free pick): the returned patch is `data`
   * with `resources` latched when the pick was already spent. A refusal otherwise.
   */
  private async gateProgression(
    id: string,
    data: UpdateCrewData
  ): Promise<{ refused: Result<never> } | { patch: UpdateCrewData }> {
    if (data.crewAbilities === undefined && data.resources === undefined) return { patch: data };
    const { data: row, error } = await this.db.from('crews').select('*').eq('id', id).single();
    if (error) return { refused: failFromError(error) };
    const prior = fromSupabaseCrew(row);
    const next = {
      crewAbilities: data.crewAbilities ?? prior.crewAbilities,
      resources: data.resources ?? prior.resources,
    };
    const added = next.crewAbilities.some(a => !prior.crewAbilities.includes(a));
    const touchesUpgrades = Object.keys(next.resources).some(k => k.startsWith('crew-upgrade:'));
    const flagged = (prior.resources[CREW_STARTING_PICK_KEY] ?? 0) > 0;
    // The ruleset is needed to judge an addition, or to tell whether a legacy crew's held
    // abilities include a special ability (its free pick, spent before the latch existed).
    const needsRuleset = added || touchesUpgrades || (!flagged && prior.crewAbilities.length > 0);
    if (!needsRuleset) return { patch: latchedPatch(null, prior, data, next.resources) };
    const ruleset = await this.rulesetForGame(prior.gameId);
    if (!ruleset.success) return { refused: ruleset as Result<never> };
    if (added || touchesUpgrades) {
      const check = checkCrewProgression(
        ruleset.data,
        { ...prior, crewType: data.crewType ?? prior.crewType },
        next
      );
      if (!check.ok)
        return { refused: { success: false, error: { message: check.message, code: check.code } } };
    }
    return { patch: latchedPatch(ruleset.data, prior, data, next.resources) };
  }

  async update(id: string, data: UpdateCrewData): Promise<Result<Crew>> {
    return this.run(async () => {
      const gated = await this.gateProgression(id, data);
      if ('refused' in gated) return gated.refused;
      // Rep is capped at the tracker length — 12 less held turf (RAW: "12 is the max", no carry).
      // The cap depends on the claims, so a rep write reads them unless the same patch sets them.
      let patch = gated.patch;
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
        patch = { ...patch, rep: clampRep(data.rep, claims) };
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
