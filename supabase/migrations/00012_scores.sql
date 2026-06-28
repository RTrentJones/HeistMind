-- HeistMind — scores / operations (campaign). A score is the per-operation unit of play that
-- per-score loadout hangs off (BitD: load is chosen per operation). A game runs as a series of
-- scores; AT MOST ONE may be 'active' at a time (enforced by a partial unique index). Sessions are
-- real-life and NOT modelled — one score may span sessions, or several scores fit one session.
-- DB-backed shared state: members read, the game's GM starts/ends/edits. Reuses is_game_gm /
-- is_active_game_member (from 00006). Also widens the rolls "kind" check so the existing roll log can
-- carry loadout/score events (the campaign log is the roll log, broadening) — no column/type change.
--
-- Single self-contained DO block (like 00005–00008): set the env search_path once, then all DDL via
-- EXECUTE so it's robust to however migrations are applied (CI psql session OR `supabase db reset`).

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Deploying scores table to schema: %', target_schema;

  EXECUTE $ct$
    CREATE TABLE IF NOT EXISTS scores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
      name TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      ended_at TIMESTAMPTZ,
      created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  $ct$;

  -- A score is either in play or wrapped.
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = target_schema || '_scores_status_check'
                 AND table_name = 'scores' AND table_schema = target_schema) THEN
    EXECUTE format(
      'ALTER TABLE scores ADD CONSTRAINT %I CHECK (status IN (''active'', ''completed''))',
      target_schema || '_scores_status_check');
  END IF;

  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON scores TO anon, authenticated, service_role';
  EXECUTE 'ALTER TABLE scores ENABLE ROW LEVEL SECURITY';

  -- RLS: active members read; the game's GM runs the score lifecycle.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = target_schema || '_scores_select_policy'
                 AND tablename = 'scores' AND schemaname = target_schema) THEN
    EXECUTE format(
      'CREATE POLICY %I ON scores FOR SELECT USING (is_active_game_member(auth.uid(), game_id))',
      target_schema || '_scores_select_policy');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = target_schema || '_scores_insert_policy'
                 AND tablename = 'scores' AND schemaname = target_schema) THEN
    EXECUTE format(
      'CREATE POLICY %I ON scores FOR INSERT WITH CHECK (is_game_gm(auth.uid(), game_id))',
      target_schema || '_scores_insert_policy');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = target_schema || '_scores_update_policy'
                 AND tablename = 'scores' AND schemaname = target_schema) THEN
    EXECUTE format(
      'CREATE POLICY %I ON scores FOR UPDATE USING (is_game_gm(auth.uid(), game_id)) WITH CHECK (is_game_gm(auth.uid(), game_id))',
      target_schema || '_scores_update_policy');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = target_schema || '_scores_delete_policy'
                 AND tablename = 'scores' AND schemaname = target_schema) THEN
    EXECUTE format(
      'CREATE POLICY %I ON scores FOR DELETE USING (is_game_gm(auth.uid(), game_id))',
      target_schema || '_scores_delete_policy');
  END IF;

  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_scores_game_id ON scores(game_id)';
  -- At most one active score per game (partial unique index).
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_scores_one_active_per_game ON scores(game_id) WHERE status = ''active''';

  -- Widen the roll-log "kind" check so loadout/score events can live in the existing append-only log
  -- (the campaign log is the roll log). `kind` stays TEXT — no column/type change, so this needs no
  -- supabase-types regen; only the new `scores` table does.
  EXECUTE format('ALTER TABLE rolls DROP CONSTRAINT IF EXISTS %I', target_schema || '_rolls_kind_check');
  EXECUTE format(
    'ALTER TABLE rolls ADD CONSTRAINT %I CHECK (kind IN (''action'', ''resistance'', ''fortune'', ''downtime'', ''loadout'', ''score''))',
    target_schema || '_rolls_kind_check');
END
$do$;
