-- HeistMind — campaign↔Discord links (bot phase 2, BRD R-H2.1). A GM links their campaign to a
-- Discord surface at one of three scopes, all stored in two columns:
--   channel:  discord_channel_id = a text-channel snowflake
--   category: discord_channel_id = a category snowflake (interaction payloads carry
--             channel.parent_id, so every child channel resolves with no extra fetch)
--   server:   discord_channel_id NULL, discord_guild_id set (the guild-wide default;
--             channel/category links take precedence at resolution time)
-- Uniqueness: one campaign per channel/category snowflake; at most ONE guild-wide default per
-- guild. Resolution order (bot): channel.id → channel.parent_id → the guild default.
--
-- New COLUMNS → requires a `pnpm db:types` regen (types committed alongside).
-- Single self-contained DO block (like 00005–00016).

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Adding Discord link columns to games in schema: %', target_schema;

  EXECUTE 'ALTER TABLE games ADD COLUMN IF NOT EXISTS discord_guild_id TEXT';
  EXECUTE 'ALTER TABLE games ADD COLUMN IF NOT EXISTS discord_channel_id TEXT';

  -- One campaign per channel/category snowflake.
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_games_discord_channel ON games(discord_channel_id) WHERE discord_channel_id IS NOT NULL';
  -- At most one guild-wide default link per guild.
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_games_discord_guild_default ON games(discord_guild_id) WHERE discord_guild_id IS NOT NULL AND discord_channel_id IS NULL';
  -- Resolution lookups hit the guild first.
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_games_discord_guild ON games(discord_guild_id) WHERE discord_guild_id IS NOT NULL';
END
$do$;
