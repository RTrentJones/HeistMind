-- HeistMind — the crew sheet (campaign). One shared crew per game: type, tier, rep, heat, wanted,
-- hold, coin/vault, crew abilities, claims, and cohorts. DB-backed shared state — members read it
-- on load; the game's GM maintains it. Reuses is_game_gm (from 00006).
--
-- Single self-contained DO block (like 00005/00006): set the env search_path once, then all DDL via
-- EXECUTE so it's robust to however migrations are applied (CI psql session OR `supabase db reset`).

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Deploying crews table to schema: %', target_schema;

  EXECUTE $ct$
    CREATE TABLE IF NOT EXISTS crews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL UNIQUE,
      name TEXT,
      crew_type TEXT,
      tier INTEGER NOT NULL DEFAULT 0,
      rep INTEGER NOT NULL DEFAULT 0,
      heat INTEGER NOT NULL DEFAULT 0,
      wanted INTEGER NOT NULL DEFAULT 0,
      hold TEXT NOT NULL DEFAULT 'strong',
      coin INTEGER NOT NULL DEFAULT 0,
      vault INTEGER NOT NULL DEFAULT 0,
      crew_abilities TEXT[] NOT NULL DEFAULT '{}',
      claims JSONB NOT NULL DEFAULT '[]',
      cohorts JSONB NOT NULL DEFAULT '[]',
      created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  $ct$;

  -- Idempotent, schema-scoped check constraints (FitD bounds).
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = target_schema || '_crews_bounds_check'
                 AND table_name = 'crews' AND table_schema = target_schema) THEN
    EXECUTE format(
      'ALTER TABLE crews ADD CONSTRAINT %I CHECK (tier BETWEEN 0 AND 4 AND rep >= 0 AND heat BETWEEN 0 AND 9 AND wanted BETWEEN 0 AND 4 AND coin >= 0 AND vault >= 0)',
      target_schema || '_crews_bounds_check');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = target_schema || '_crews_hold_check'
                 AND table_name = 'crews' AND table_schema = target_schema) THEN
    EXECUTE format(
      'ALTER TABLE crews ADD CONSTRAINT %I CHECK (hold IN (''weak'', ''strong''))',
      target_schema || '_crews_hold_check');
  END IF;

  -- Belt-and-suspenders grants (00003 sets default privileges; this guarantees the new table).
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON crews TO anon, authenticated, service_role';
  EXECUTE 'ALTER TABLE crews ENABLE ROW LEVEL SECURITY';

  -- RLS: active members read; the game's GM maintains the sheet.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = target_schema || '_crews_select_policy'
                 AND tablename = 'crews' AND schemaname = target_schema) THEN
    EXECUTE format(
      'CREATE POLICY %I ON crews FOR SELECT USING (is_active_game_member(auth.uid(), game_id))',
      target_schema || '_crews_select_policy');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = target_schema || '_crews_insert_policy'
                 AND tablename = 'crews' AND schemaname = target_schema) THEN
    EXECUTE format(
      'CREATE POLICY %I ON crews FOR INSERT WITH CHECK (is_game_gm(auth.uid(), game_id))',
      target_schema || '_crews_insert_policy');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = target_schema || '_crews_update_policy'
                 AND tablename = 'crews' AND schemaname = target_schema) THEN
    EXECUTE format(
      'CREATE POLICY %I ON crews FOR UPDATE USING (is_game_gm(auth.uid(), game_id)) WITH CHECK (is_game_gm(auth.uid(), game_id))',
      target_schema || '_crews_update_policy');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = target_schema || '_crews_delete_policy'
                 AND tablename = 'crews' AND schemaname = target_schema) THEN
    EXECUTE format(
      'CREATE POLICY %I ON crews FOR DELETE USING (is_game_gm(auth.uid(), game_id))',
      target_schema || '_crews_delete_policy');
  END IF;

  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_crews_game_id ON crews(game_id)';
END
$do$;
