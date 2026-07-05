-- HeistMind — persist the zero-dice flag on rolls (audit finding P2). A rating-0 FitD roll
-- rolls TWO dice and takes the LOWEST; both clients persist `dice = 2` (dice actually rolled)
-- and the flag was dropped at the adapter — so the web feed's `r.dice === 0` inference never
-- fired and a zero-dice resistance DISPLAYED `6 − highest` while the engine correctly charged
-- `6 − lowest` (the persisted outcome was always right; display-only bug).
--
-- Historical rows default false and stay cosmetically wrong for old zero-dice resists —
-- accepted; there is no reliable heuristic to backfill them.
--
-- Single self-contained DO block (like 00005–00018). Needs the types-regen handoff
-- (`pnpm db:types`) before the adapter change type-checks.

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Adding rolls.zero_dice in schema: %', target_schema;

  EXECUTE 'ALTER TABLE rolls ADD COLUMN IF NOT EXISTS zero_dice BOOLEAN NOT NULL DEFAULT false';
END
$do$;
