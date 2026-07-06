-- HeistMind — account deletion 500 on beta (found by the /settings walkthrough).
--
-- GoTrue's `auth.admin.deleteUser` cascades auth.users → public.profiles → <env>.games →
-- <env>.game_players. That last cascade fires `update_game_player_count()`, whose body runs
-- `UPDATE games …` UNQUALIFIED, with the INVOKER's privileges — and the invoker here is
-- supabase_auth_admin, which has no USAGE on the env schema. Postgres search_path resolution
-- silently SKIPS schemas the role can't use, so even a pinned search_path can't see
-- <env>.games for that role → `relation "games" does not exist` → the whole user deletion
-- aborts → 500. (Through PostgREST the invoker is authenticated/service_role, which do have
-- USAGE — which is why every normal app path works and only the auth cascade breaks.)
--
-- Fix, two halves, both required:
--   1) SECURITY DEFINER on the trigger functions — they run as their owner (postgres), which
--      has USAGE everywhere, so resolution and the UPDATE both work no matter who triggers
--      the cascade.
--   2) A pinned search_path — mandatory hygiene for SECURITY DEFINER (prevents resolution
--      hijack via the caller's search_path) and what makes the unqualified `games` reference
--      resolve to THIS env's schema.
-- Same hardening for auto_assign_game_master (same class; INSERT-time) and
-- get_user_game_role (already SECURITY DEFINER, was missing the pinned search_path).
--
-- No table/column changes → no `pnpm db:types` regen needed.
-- Single self-contained DO block (like 00005–00020); idempotent (ALTER ... SET/SECURITY are).

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
  fn TEXT;
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Hardening trigger functions in schema: %', target_schema;

  FOREACH fn IN ARRAY ARRAY['update_game_player_count()', 'auto_assign_game_master()',
                            'get_user_game_role(uuid, uuid)'] LOOP
    IF to_regprocedure(format('%I.%s', target_schema, fn)) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %I.%s SECURITY DEFINER SET search_path TO %I, public',
                     target_schema, fn, target_schema);
      RAISE NOTICE 'Hardened %.% (security definer + pinned search_path)', target_schema, fn;
    ELSE
      RAISE NOTICE 'Skipped %.% (not present in this schema)', target_schema, fn;
    END IF;
  END LOOP;
END
$do$;
