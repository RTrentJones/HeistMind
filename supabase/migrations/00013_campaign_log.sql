-- HeistMind — campaign log (Phase 2). The rolls table is the campaign's append-only event feed.
-- This adds `score_id` so every event knows which score / operation it belongs to (the feed groups
-- by it), and a `note` kind for manually-recorded results (a result settled IRL or on Discord can be
-- entered here). `score_id` is nullable (events outside a score, or before scores are used) and FK →
-- scores with ON DELETE SET NULL (a deleted score unlinks its events, it doesn't drop them).
--
-- `score_id` is a new COLUMN → needs a supabase-types regen (`pnpm db:types`). The kind-check widening
-- is a constraint only (kind stays TEXT) → no type impact.
--
-- Single self-contained DO block (like 00005–00012).

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Extending rolls (campaign log) in schema: %', target_schema;

  -- Associate each logged event with a score (the per-operation grouping for the feed).
  EXECUTE 'ALTER TABLE rolls ADD COLUMN IF NOT EXISTS score_id UUID REFERENCES scores(id) ON DELETE SET NULL';
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_rolls_score_id ON rolls(score_id)';

  -- Widen the kind check to allow manually-entered results ('note'), alongside the existing kinds.
  EXECUTE format('ALTER TABLE rolls DROP CONSTRAINT IF EXISTS %I', target_schema || '_rolls_kind_check');
  EXECUTE format(
    'ALTER TABLE rolls ADD CONSTRAINT %I CHECK (kind IN (''action'', ''resistance'', ''fortune'', ''downtime'', ''loadout'', ''score'', ''note''))',
    target_schema || '_rolls_kind_check');
END
$do$;
