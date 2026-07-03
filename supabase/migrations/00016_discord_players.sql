-- HeistMind — Discord player state (bot phase 1). One row per HeistMind profile that uses the
-- Discord bot, holding the ACTIVE character pointer (/character use): the PK-on-profile_id makes
-- "one active character at a time" structural. Written ONLY by the bot's service-role client:
-- granted to service_role alone, RLS enabled with NO policies, so the PostgREST-exposed env
-- schemas give anon/authenticated nothing here (the service role bypasses RLS by design).
-- The profiles FK crosses into public (the established direction); the characters FK is
-- same-schema, which is why this table is per-env rather than public.
--
-- New TABLE → requires a `pnpm db:types` regen (types committed alongside).
-- Single self-contained DO block (like 00005–00015).

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Deploying discord_players table to schema: %', target_schema;

  EXECUTE $ct$
    CREATE TABLE IF NOT EXISTS discord_players (
      profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
      active_character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  $ct$;

  -- Bot-only surface — service_role is the only way in. The schema's DEFAULT PRIVILEGES (00003)
  -- hand every new table to anon/authenticated, so REVOKE those explicitly; RLS-enabled with no
  -- policies is the second lock (deny-by-default even if a grant ever reappears).
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON discord_players TO service_role';
  EXECUTE 'REVOKE ALL ON discord_players FROM anon, authenticated';
  EXECUTE 'ALTER TABLE discord_players ENABLE ROW LEVEL SECURITY';

  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_discord_players_active_character ON discord_players(active_character_id)';
END
$do$;
