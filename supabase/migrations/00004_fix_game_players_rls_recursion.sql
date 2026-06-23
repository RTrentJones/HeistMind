-- HeistMind — fix infinite recursion in the game_players SELECT policy.
--
-- 00002's `game_players_select_policy` checks "is the caller an active member of this game?"
-- with an inline `EXISTS (SELECT 1 FROM game_players ...)`. Because that subquery hits
-- game_players, it re-enters the very policy being evaluated, so Postgres aborts with
-- "infinite recursion detected in policy for relation game_players". This fires on every
-- `games` INSERT (the RETURNING SELECT evaluates games' RLS, which embeds game_players).
--
-- Forward-only fix (we never edit an already-named migration — `supabase db push` tracks by
-- name, so an edit to 00002 wouldn't re-apply to a project that already has it). We add a
-- SECURITY DEFINER helper whose lookup runs as the table owner and BYPASSES RLS, then point
-- the policy at it — breaking the cycle. Runs against whichever env schema 00002 targeted.

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
  -- Mirror 00002's get_constraint_name(): `<schema>_<base>`.
  policy_name TEXT := target_schema || '_game_players_select_policy';
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);

  -- Active-membership check that does NOT re-enter game_players RLS (SECURITY DEFINER).
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION is_active_game_member(p_user_id UUID, p_game_id UUID)
    RETURNS BOOLEAN AS $fnbody$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM game_players
        WHERE player_id = p_user_id
          AND game_id = p_game_id
          AND status = 'active'
      );
    END;
    $fnbody$ LANGUAGE plpgsql SECURITY DEFINER;
  $create$;

  -- Replace the self-referential SELECT policy with the non-recursive helper.
  EXECUTE format('DROP POLICY IF EXISTS %I ON game_players', policy_name);
  EXECUTE format(
    'CREATE POLICY %I ON game_players FOR SELECT USING (player_id = auth.uid() OR is_active_game_member(auth.uid(), game_players.game_id))',
    policy_name
  );
END
$do$;
