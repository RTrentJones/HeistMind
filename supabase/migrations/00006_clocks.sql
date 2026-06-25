-- HeistMind — progress clocks (campaign). FitD clocks: a named ring of 4/6/8/10/12 segments that
-- fills as a situation develops. Per-game, GM-owned shared state — every player sees them on load
-- (no realtime needed). Members read; the game's GM (creator) creates / ticks / removes them.
--
-- Single self-contained DO block (like 00005): set the env search_path once, then all DDL via
-- EXECUTE so it's robust to however migrations are applied (CI psql session OR `supabase db reset`).

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Deploying clocks table to schema: %', target_schema;

  -- GM check that bypasses RLS (SECURITY DEFINER), mirroring is_active_game_member from 00004.
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION is_game_gm(p_user_id UUID, p_game_id UUID)
    RETURNS BOOLEAN AS $fnbody$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM games WHERE id = p_game_id AND created_by = p_user_id
      );
    END;
    $fnbody$ LANGUAGE plpgsql SECURITY DEFINER;
  $create$;

  EXECUTE $ct$
    CREATE TABLE IF NOT EXISTS clocks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
      name TEXT NOT NULL,
      segments INTEGER NOT NULL DEFAULT 4,
      filled INTEGER NOT NULL DEFAULT 0,
      linked_type TEXT,
      linked_id UUID,
      created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  $ct$;

  -- Idempotent, schema-scoped check constraints.
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = target_schema || '_clocks_segments_check'
                 AND table_name = 'clocks' AND table_schema = target_schema) THEN
    EXECUTE format(
      'ALTER TABLE clocks ADD CONSTRAINT %I CHECK (segments IN (4, 6, 8, 10, 12))',
      target_schema || '_clocks_segments_check');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = target_schema || '_clocks_filled_check'
                 AND table_name = 'clocks' AND table_schema = target_schema) THEN
    EXECUTE format(
      'ALTER TABLE clocks ADD CONSTRAINT %I CHECK (filled >= 0 AND filled <= segments)',
      target_schema || '_clocks_filled_check');
  END IF;

  -- Belt-and-suspenders grants (00003 sets default privileges; this guarantees the new table).
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON clocks TO anon, authenticated, service_role';
  EXECUTE 'ALTER TABLE clocks ENABLE ROW LEVEL SECURITY';

  -- RLS: active members read; the game's GM creates / ticks / removes.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = target_schema || '_clocks_select_policy'
                 AND tablename = 'clocks' AND schemaname = target_schema) THEN
    EXECUTE format(
      'CREATE POLICY %I ON clocks FOR SELECT USING (is_active_game_member(auth.uid(), game_id))',
      target_schema || '_clocks_select_policy');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = target_schema || '_clocks_insert_policy'
                 AND tablename = 'clocks' AND schemaname = target_schema) THEN
    EXECUTE format(
      'CREATE POLICY %I ON clocks FOR INSERT WITH CHECK (is_game_gm(auth.uid(), game_id))',
      target_schema || '_clocks_insert_policy');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = target_schema || '_clocks_update_policy'
                 AND tablename = 'clocks' AND schemaname = target_schema) THEN
    EXECUTE format(
      'CREATE POLICY %I ON clocks FOR UPDATE USING (is_game_gm(auth.uid(), game_id)) WITH CHECK (is_game_gm(auth.uid(), game_id))',
      target_schema || '_clocks_update_policy');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = target_schema || '_clocks_delete_policy'
                 AND tablename = 'clocks' AND schemaname = target_schema) THEN
    EXECUTE format(
      'CREATE POLICY %I ON clocks FOR DELETE USING (is_game_gm(auth.uid(), game_id))',
      target_schema || '_clocks_delete_policy');
  END IF;

  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_clocks_game_id ON clocks(game_id)';
END
$do$;
