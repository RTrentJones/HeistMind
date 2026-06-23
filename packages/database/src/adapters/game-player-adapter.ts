// Type adapter for the GamePlayer entity (development/production schema). Read-only:
// rows are created by the `auto_assign_game_master` trigger / invitation flow.
import type { Tables } from '../supabase-types';
import type { GamePlayer, GameRole, PlayerStatus } from '../domain-types';
import { parseSupabaseDate, parseSupabaseJson } from './profile-adapter';

type GamePlayerRow = Tables<{ schema: 'development' }, 'game_players'>;

export function fromSupabaseGamePlayer(row: GamePlayerRow): GamePlayer {
  return {
    id: row.id,
    gameId: row.game_id,
    playerId: row.player_id,
    role: (row.role ?? 'player') as GameRole,
    status: (row.status ?? 'active') as PlayerStatus,
    permissions: parseSupabaseJson<Record<string, unknown>>(row.permissions, {}),
    invitedAt: parseSupabaseDate(row.invited_at),
    joinedAt: row.joined_at ? parseSupabaseDate(row.joined_at) : null,
    leftAt: row.left_at ? parseSupabaseDate(row.left_at) : null,
  };
}
