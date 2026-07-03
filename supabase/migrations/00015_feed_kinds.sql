-- HeistMind — feed completeness (round-3 PR-3). Widens the rolls "kind" CHECK so crew, faction,
-- clock, and XP changes land in the same append-only campaign log as every other mechanical event
-- (BRD R-E1: the unified log covers crew/faction changes and XP marks/advances).
--
-- Constraint-only change (kind stays TEXT) → no supabase-types regen needed.
--
-- Single self-contained DO block (like 00005–00014).

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Widening rolls kind check (crew/faction/clock/xp) in schema: %', target_schema;

  EXECUTE format('ALTER TABLE rolls DROP CONSTRAINT IF EXISTS %I', target_schema || '_rolls_kind_check');
  EXECUTE format(
    'ALTER TABLE rolls ADD CONSTRAINT %I CHECK (kind IN (''action'', ''resistance'', ''fortune'', ''downtime'', ''loadout'', ''score'', ''crew'', ''faction'', ''clock'', ''xp'', ''note''))',
    target_schema || '_rolls_kind_check');
END
$do$;
