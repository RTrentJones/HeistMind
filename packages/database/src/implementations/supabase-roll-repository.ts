// Supabase RollRepository — the per-game, append-only dice-roll log. The outcome is recomputed from
// the dice faces (rollOutcome) here, so a client going through the repository can't persist a fake
// result. For web writes this runs in the browser (F100 — not a server-side check).
import type { Roll, CreateRollData, Result } from '@heist-mind/core';
import type { AssistCharge, RollRepository } from '../repositories';
import { rollOutcome } from '@heist-mind/core';
import { fromSupabaseRoll, toSupabaseRollInsert } from '../adapters/roll-adapter';
import { failFromError } from './result-helpers';
import { SupabaseRepositoryBase } from './repository-base';

export class SupabaseRollRepository extends SupabaseRepositoryBase implements RollRepository {
  async create(userId: string, data: CreateRollData): Promise<Result<Roll>> {
    return this.run(async () => {
      const outcome = rollOutcome(data.results, { zeroDice: data.zeroDice });
      // Tag the event with the campaign's active score so the feed can group by operation. A caller
      // may override (an explicit id, e.g. a score's own start/end event, or null to skip); only when
      // unspecified do we resolve the active score here.
      let scoreId = data.scoreId ?? null;
      if (data.scoreId === undefined) {
        const { data: active } = await this.db
          .from('scores')
          .select('id')
          .eq('game_id', data.gameId)
          .eq('status', 'active')
          .maybeSingle();
        scoreId = active?.id ?? null;
      }
      const { data: row, error } = await this.db
        .from('rolls')
        .insert(toSupabaseRollInsert(data, userId, outcome, scoreId))
        .select()
        .single();
      if (error) return failFromError(error);
      return { success: true, data: fromSupabaseRoll(row) };
    });
  }

  async chargeAssistStress(
    rollId: string,
    characterId: string,
    note: string
  ): Promise<Result<AssistCharge>> {
    return this.run(async () => {
      const { data, error } = await this.rpcUntyped('charge_assist_stress', {
        p_roll_id: rollId,
        p_character_id: characterId,
        p_note: note,
      });
      if (error) return failFromError(error);
      if (data === 'charged' || data === 'near_limit') return { success: true, data };
      return { success: false, error: { message: 'Unexpected assist charge result' } };
    });
  }

  async findByGame(gameId: string, limit = 50): Promise<Result<Roll[]>> {
    return this.run(async () => {
      const { data: rows, error } = await this.db
        .from('rolls')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) return failFromError(error);
      return { success: true, data: (rows ?? []).map(fromSupabaseRoll) };
    });
  }
}
