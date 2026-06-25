-- HeistMind — factions + status (campaign). The city's powers: each faction has a tier (0–6) and a
-- status toward the crew (−3 war … +3 allied). Faction "projects" reuse the clocks table (a clock
-- linked_type='faction', linked_id=<faction>). DB-backed shared state; members read, the GM writes.
-- Reuses is_game_gm (from 00006).
--
-- Single self-contained DO block (like 00005–00007): set the env search_path once, then all DDL via
-- EXECUTE so it's robust to however migrations are applied (CI psql session OR `supabase db reset`).

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Deploying factions table to schema: %', target_schema;

  EXECUTE $ct$
    CREATE TABLE IF NOT EXISTS factions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
      name TEXT NOT NULL,
      faction_type TEXT,
      tier INTEGER NOT NULL DEFAULT 0,
      status INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  $ct$;

  -- Idempotent, schema-scoped check constraints (FitD bounds: tier 0–6, status −3..+3).
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = target_schema || '_factions_bounds_check'
                 AND table_name = 'factions' AND table_schema = target_schema) THEN
    EXECUTE format(
      'ALTER TABLE factions ADD CONSTRAINT %I CHECK (tier BETWEEN 0 AND 6 AND status BETWEEN -3 AND 3)',
      target_schema || '_factions_bounds_check');
  END IF;

  -- Belt-and-suspenders grants (00003 sets default privileges; this guarantees the new table).
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON factions TO anon, authenticated, service_role';
  EXECUTE 'ALTER TABLE factions ENABLE ROW LEVEL SECURITY';

  -- RLS: active members read; the game's GM maintains them.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = target_schema || '_factions_select_policy'
                 AND tablename = 'factions' AND schemaname = target_schema) THEN
    EXECUTE format(
      'CREATE POLICY %I ON factions FOR SELECT USING (is_active_game_member(auth.uid(), game_id))',
      target_schema || '_factions_select_policy');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = target_schema || '_factions_insert_policy'
                 AND tablename = 'factions' AND schemaname = target_schema) THEN
    EXECUTE format(
      'CREATE POLICY %I ON factions FOR INSERT WITH CHECK (is_game_gm(auth.uid(), game_id))',
      target_schema || '_factions_insert_policy');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = target_schema || '_factions_update_policy'
                 AND tablename = 'factions' AND schemaname = target_schema) THEN
    EXECUTE format(
      'CREATE POLICY %I ON factions FOR UPDATE USING (is_game_gm(auth.uid(), game_id)) WITH CHECK (is_game_gm(auth.uid(), game_id))',
      target_schema || '_factions_update_policy');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = target_schema || '_factions_delete_policy'
                 AND tablename = 'factions' AND schemaname = target_schema) THEN
    EXECUTE format(
      'CREATE POLICY %I ON factions FOR DELETE USING (is_game_gm(auth.uid(), game_id))',
      target_schema || '_factions_delete_policy');
  END IF;

  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_factions_game_id ON factions(game_id)';
END
$do$;
