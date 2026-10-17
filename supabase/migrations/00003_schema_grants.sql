-- HeistMind — API-role grants for the per-env schemas.
--
-- 00002 creates the `development` / `production` schemas and exposes them to PostgREST
-- (supabase/config.toml `[api].schemas`), but Supabase only auto-grants its API roles
-- (anon / authenticated / service_role) on `public`. A custom schema is invisible to
-- those roles until granted, so every PostgREST request to it fails with
-- `42501 permission denied for schema <env>` before RLS is ever consulted.
--
-- These grants are the BASE privilege layer; row visibility is still governed entirely by
-- the RLS policies defined in 00002 (every core table has RLS enabled). This mirrors what
-- Supabase does for `public`: the roles can reach the tables, RLS decides which rows.
-- Default privileges cover tables created later (e.g. when `production` is first deployed
-- with `heistmind.target_schema = production`).

DO $$
DECLARE
  env_schema TEXT;
BEGIN
  FOREACH env_schema IN ARRAY ARRAY['development', 'production'] LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO anon, authenticated, service_role', env_schema);
    -- DML only for the API roles (no TRUNCATE — it ignores RLS — nor TRIGGER/REFERENCES; F89).
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO anon, authenticated', env_schema);
    EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO service_role', env_schema);
    EXECUTE format(
      'GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO anon, authenticated, service_role', env_schema);
    -- No anon EXECUTE: the SECURITY DEFINER helpers were callable as oracles (F89).
    EXECUTE format(
      'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA %I TO authenticated, service_role', env_schema);
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated',
      env_schema);
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON TABLES TO service_role', env_schema);
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON SEQUENCES TO anon, authenticated, service_role',
      env_schema);
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role',
      env_schema);
  END LOOP;
END $$;

-- public.profiles is created by 00001 with RLS but no role grants, so PostgREST requests
-- fail with `42501 permission denied for table profiles` before RLS is consulted. The
-- core repositories stitch profiles across schemas (development.games.created_by →
-- public.profiles), so every game/character detail read needs SELECT here. RLS ("Public
-- profiles are viewable by everyone" / "update own") still governs which rows.
--
-- F89: no anon access (emails/discord ids were world-readable), and column-level grants only —
-- signed-in users read the display columns and edit their own safe columns (never discord_id/id).
-- 00022 restates this as the authoritative final state.
GRANT SELECT (id, username, avatar_url, created_at, updated_at) ON public.profiles TO authenticated;
GRANT UPDATE (username, avatar_url, preferences) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
