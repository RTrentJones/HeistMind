-- HeistMind — harm feed events (bot phase-3 PR-1). Widens the rolls "kind" CHECK so harm
-- taken/cleared lands in the same append-only campaign log as every other mechanical event
-- (BRD R-E1 completeness; Discord /harm and the web sheet write through engine
-- takeHarm/clearHarm).
--
-- Constraint-only change (kind stays TEXT) → no supabase-types regen needed.
--
-- Single self-contained DO block (like 00005–00015).

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Widening rolls kind check (harm) in schema: %', target_schema;

  EXECUTE format('ALTER TABLE rolls DROP CONSTRAINT IF EXISTS %I', target_schema || '_rolls_kind_check');
  EXECUTE format(
    'ALTER TABLE rolls ADD CONSTRAINT %I CHECK (kind IN (''action'', ''resistance'', ''fortune'', ''downtime'', ''loadout'', ''score'', ''crew'', ''faction'', ''clock'', ''xp'', ''harm'', ''note''))',
    target_schema || '_rolls_kind_check');
END
$do$;
