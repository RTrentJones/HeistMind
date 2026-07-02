// Database Provider Factory
// Implementation-agnostic database provider that can be configured with different backends

import type { DatabaseProvider, DatabaseRepositories } from './repositories';
import type { AuthService } from './auth-types';
import { SupabaseProfileRepository } from './implementations/supabase-profile-repository';
import { SupabaseRulesetRepository } from './implementations/supabase-ruleset-repository';
import { SupabaseInvitationRepository } from './implementations/supabase-invitation-repository';
import { SupabaseGameRepository } from './implementations/supabase-game-repository';
import { SupabaseGamePlayerRepository } from './implementations/supabase-game-player-repository';
import { SupabaseCharacterRepository } from './implementations/supabase-character-repository';
import { SupabaseRollRepository } from './implementations/supabase-roll-repository';
import { SupabaseClockRepository } from './implementations/supabase-clock-repository';
import { SupabaseCrewRepository } from './implementations/supabase-crew-repository';
import { SupabaseFactionRepository } from './implementations/supabase-faction-repository';
import { SupabaseScoreRepository } from './implementations/supabase-score-repository';
import { SupabaseCharacterManagementRepository } from './implementations/supabase-character-management-repository';
import type { CoreSchema } from './implementations/result-helpers';
import { SupabaseAuthService } from './implementations/supabase-auth-service';
import { createClient } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';

// Configuration for database providers
export interface DatabaseConfig {
  provider: 'supabase';
  supabase?: {
    url?: string;
    key?: string;
    client?: SupabaseClient<Database>;
  };
}

// Default configuration
const DEFAULT_CONFIG: DatabaseConfig = {
  provider: 'supabase',
  supabase: {
    ...(process.env.NEXT_PUBLIC_SUPABASE_URL !== undefined
      ? { url: process.env.NEXT_PUBLIC_SUPABASE_URL }
      : {}),
    ...(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== undefined
      ? { key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }
      : {}),
  },
};

// Supabase implementation of DatabaseProvider
class SupabaseDatabaseProvider implements DatabaseProvider {
  private client: SupabaseClient<Database>;

  constructor(config: DatabaseConfig['supabase'] = {}) {
    if (config.client) {
      this.client = config.client;
    } else {
      const url = config.url || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = config.key || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        throw new Error('Supabase URL and key are required');
      }

      this.client = createClient(url, key);
    }
  }

  // Supabase connects lazily and needs no explicit teardown; these satisfy the provider contract.
  async connect(): Promise<void> {}

  async disconnect(): Promise<void> {}

  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check - try to query the profiles table
      const { error } = await this.client.from('profiles').select('id').limit(1);

      return !error;
    } catch {
      return false;
    }
  }

  createRepositories(): DatabaseRepositories {
    // Core tables (rulesets/games/characters/game_players) live in an env schema
    // (default 'development' per the migration); profiles stays in public.
    const schema: CoreSchema =
      (process.env.NEXT_PUBLIC_HEISTMIND_SCHEMA as CoreSchema) || 'development';

    return {
      profiles: new SupabaseProfileRepository(this.client),
      rulesets: new SupabaseRulesetRepository(this.client, schema),
      games: new SupabaseGameRepository(this.client, schema),
      gamePlayers: new SupabaseGamePlayerRepository(this.client, schema),
      characters: new SupabaseCharacterRepository(this.client, schema),
      rolls: new SupabaseRollRepository(this.client, schema),
      clocks: new SupabaseClockRepository(this.client, schema),
      crews: new SupabaseCrewRepository(this.client, schema),
      factions: new SupabaseFactionRepository(this.client, schema),
      scores: new SupabaseScoreRepository(this.client, schema),
      characterManagement: new SupabaseCharacterManagementRepository(this.client, schema),
      invitations: new SupabaseInvitationRepository(this.client, schema),
    };
  }

  createAuthService(): AuthService {
    return new SupabaseAuthService(this.client);
  }
}

// Factory function to create database provider
export function createDatabaseProvider(config: DatabaseConfig = DEFAULT_CONFIG): DatabaseProvider {
  switch (config.provider) {
    case 'supabase':
      return new SupabaseDatabaseProvider(config.supabase);
    default:
      throw new Error(`Unsupported database provider: ${config.provider}`);
  }
}

// Convenience function to create repositories directly
export function createRepositories(config?: DatabaseConfig): DatabaseRepositories {
  const provider = createDatabaseProvider(config);
  return provider.createRepositories();
}

// Convenience function for Next.js applications that need to pass a specific client
export function createRepositoriesWithClient(
  client: SupabaseClient<Database>
): DatabaseRepositories {
  const config: DatabaseConfig = {
    provider: 'supabase',
    supabase: { client },
  };
  return createRepositories(config);
}

// Convenience function to create auth service directly
export function createAuthService(config?: DatabaseConfig): AuthService {
  const provider = createDatabaseProvider(config);
  return provider.createAuthService();
}

// Convenience function to create auth service with specific client
export function createAuthServiceWithClient(client: SupabaseClient<Database>): AuthService {
  const config: DatabaseConfig = {
    provider: 'supabase',
    supabase: { client },
  };
  return createAuthService(config);
}
