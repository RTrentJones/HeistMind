// Supabase DiscordPlayerRepository — the bot's per-profile state (active character pointer).
// Bot-only: the table is granted to service_role alone with RLS-deny for everyone else, so this
// repo is only useful behind the bot's service-role client.
import type { Result } from '@heist-mind/core';
import type { DiscordPlayerRepository } from '../repositories';
import { failFromError, NO_ROWS } from './result-helpers';
import { SupabaseRepositoryBase } from './repository-base';

export class SupabaseDiscordPlayerRepository
  extends SupabaseRepositoryBase
  implements DiscordPlayerRepository
{
  async getActiveCharacterId(profileId: string): Promise<Result<string | null>> {
    return this.run(async () => {
      const { data: row, error } = await this.db
        .from('discord_players')
        .select('active_character_id')
        .eq('profile_id', profileId)
        .single();
      if (error) {
        if (error.code === NO_ROWS) return { success: true, data: null };
        return failFromError(error);
      }
      return { success: true, data: row.active_character_id };
    });
  }

  async setActiveCharacter(profileId: string, characterId: string): Promise<Result<void>> {
    return this.run(async () => {
      const { error } = await this.db.from('discord_players').upsert(
        {
          profile_id: profileId,
          active_character_id: characterId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id' }
      );
      if (error) return failFromError(error);
      return { success: true, data: undefined };
    });
  }

  async clearActiveCharacter(profileId: string): Promise<Result<void>> {
    return this.run(async () => {
      const { error } = await this.db
        .from('discord_players')
        .update({ active_character_id: null, updated_at: new Date().toISOString() })
        .eq('profile_id', profileId);
      if (error) return failFromError(error);
      return { success: true, data: undefined };
    });
  }
}
