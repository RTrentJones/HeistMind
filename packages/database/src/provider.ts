// Database Provider Factory
// Implementation-agnostic database provider that can be configured with different backends

import type { DatabaseProvider, DatabaseRepositories, DatabaseTransaction } from './repositories';
import type { AuthService, AuthConfig } from './auth-types';
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
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};

// Supabase implementation of DatabaseProvider
class SupabaseDatabaseProvider implements DatabaseProvider {
  private client: SupabaseClient<Database>;
  private connected = false;

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

  async connect(): Promise<void> {
    // For Supabase, connection is handled automatically
    // We could add a health check here if needed
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    // Supabase doesn't require explicit disconnection
    this.connected = false;
  }

  async migrate(): Promise<void> {
    // Migrations are handled via Supabase CLI or SQL files
    // This would typically run migration scripts
    throw new Error('Migration should be handled via Supabase CLI');
  }

  async seed(): Promise<void> {
    // Seeding would typically insert test/initial data
    throw new Error('Seeding should be handled via Supabase CLI or separate scripts');
  }

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
      characterManagement: new SupabaseCharacterManagementRepository(this.client, schema),
      invitations: new SupabaseInvitationRepository(this.client, schema),
      // Aggregate repository is outside the current journey scope.
      gameManagement: {} as any, // Placeholder
    };
  }

  createAuthService(): AuthService {
    return new SupabaseAuthService(this.client);
  }

  async beginTransaction(): Promise<DatabaseTransaction> {
    // Supabase doesn't have explicit transactions in the JS client
    // We would need to implement this using stored procedures or
    // handle it at the application level
    throw new Error('Transactions not yet implemented for Supabase provider');
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
