-- HeistMind — async dice rolls (play-by-post). A persisted, per-game roll log: every action /
-- resistance / fortune roll is stored so the whole table sees it on next load (no realtime needed).
-- Append-only (SELECT + INSERT policies only). Runs against whichever env schema the deploy targets.
--
-- Single self-contained DO block (like 00004): sets the env search_path once, then does all DDL via
-- EXECUTE so it's robust to however migrations are applied (CI psql session OR `supabase db reset`).

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Deploying rolls table to schema: %', target_schema;

  EXECUTE $ct$
    CREATE TABLE IF NOT EXISTS rolls (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
      character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
      user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
      kind TEXT NOT NULL DEFAULT 'action',
      label TEXT,
      dice INTEGER NOT NULL DEFAULT 1,
      results INTEGER[] NOT NULL DEFAULT '{}',
      outcome TEXT NOT NULL DEFAULT 'bad',
      position TEXT,
      effect TEXT,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  $ct$;

  -- Idempotent, schema-scoped check constraints.
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = target_schema || '_rolls_kind_check'
                 AND table_name = 'rolls' AND table_schema = target_schema) THEN
    EXECUTE format(
      'ALTER TABLE rolls ADD CONSTRAINT %I CHECK (kind IN (''action'', ''resistance'', ''fortune'', ''downtime''))',
      target_schema || '_rolls_kind_check');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = target_schema || '_rolls_outcome_check'
                 AND table_name = 'rolls' AND table_schema = target_schema) THEN
    EXECUTE format(
      'ALTER TABLE rolls ADD CONSTRAINT %I CHECK (outcome IN (''crit'', ''success'', ''partial'', ''bad''))',
      target_schema || '_rolls_outcome_check');
  END IF;

  -- Belt-and-suspenders grants (00003 sets default privileges; this guarantees the new table).
  EXECUTE 'GRANT SELECT, INSERT ON rolls TO anon, authenticated, service_role';
  EXECUTE 'ALTER TABLE rolls ENABLE ROW LEVEL SECURITY';

  -- Append-only RLS: active game members read the log; a member inserts only their own rolls.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = target_schema || '_rolls_select_policy'
                 AND tablename = 'rolls' AND schemaname = target_schema) THEN
    EXECUTE format(
      'CREATE POLICY %I ON rolls FOR SELECT USING (is_active_game_member(auth.uid(), game_id))',
      target_schema || '_rolls_select_policy');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = target_schema || '_rolls_insert_policy'
                 AND tablename = 'rolls' AND schemaname = target_schema) THEN
    EXECUTE format(
      'CREATE POLICY %I ON rolls FOR INSERT WITH CHECK (user_id = auth.uid() AND is_active_game_member(auth.uid(), game_id))',
      target_schema || '_rolls_insert_policy');
  END IF;

  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_rolls_game_id ON rolls(game_id)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_rolls_created_at ON rolls(created_at DESC)';
END
$do$;
