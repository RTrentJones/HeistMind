-- HeistMind — optional crew resource pools. Adds a single nullable JSONB column to `crews` holding
-- the current value of each ruleset-defined resource track (Scum & Villainy "gambits", a Wicked Ones
-- dungeon hoard, squad supplies, …), keyed by pool id. Absent/empty for BitD/Brackwater-style crews.
--
-- Additive and backwards-compatible: existing rows default to '{}' and the crew sheet renders
-- unchanged when a ruleset defines no `crew.resourcePools`. Same self-contained, schema-scoped
-- DO-block pattern as 00007_crews.sql so it's robust to however migrations are applied.

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Adding crews.resources to schema: %', target_schema;

  EXECUTE 'ALTER TABLE crews ADD COLUMN IF NOT EXISTS resources JSONB NOT NULL DEFAULT ''{}''';
END
$do$;
