-- HeistMind — let active game members read their campaign's ruleset (fixes F53).
--
-- 00002's rulesets SELECT policy is `created_by = auth.uid() OR is_public = true`. A player who
-- redeems an invite code gets an ACTIVE game_players row and can read the games row (the games
-- SELECT policy already allows active members). But GameDetailPage → games.findWithDetails then
-- reads the campaign's ruleset with `.single()`, and a joined member is neither the ruleset's
-- creator nor is the ruleset public — so the read returns no row, findWithDetails fails, and the
-- hub shows a load error. Net: you can join a campaign but can't open it.
--
-- Forward-only fix (we never edit an already-named migration — `supabase db push` tracks by name).
-- Add a SECURITY DEFINER helper that answers "is this user an active member of any game that uses
-- this ruleset?". Running as the table owner, it BYPASSES RLS on games/game_players, so it cannot
-- recurse into rulesets' own policy (same shape as 00004's is_active_game_member). Then extend the
-- rulesets SELECT policy with it. The change is additive — creator/public reads are unchanged.
-- Runs against whichever env schema 00002 targeted.

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
  -- Mirror 00002's get_constraint_name(): `<schema>_<base>`.
  policy_name TEXT := target_schema || '_rulesets_select_policy';
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);

  -- "Is the caller an active member of a game that uses this ruleset?" — SECURITY DEFINER so the
  -- lookup runs as the owner and BYPASSES RLS on games/game_players (no cross-policy recursion).
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION user_can_access_ruleset(p_user_id UUID, p_ruleset_id UUID)
    RETURNS BOOLEAN AS $fnbody$
    BEGIN
      RETURN EXISTS (
        SELECT 1
        FROM games g
        JOIN game_players gp ON gp.game_id = g.id
        WHERE g.ruleset_id = p_ruleset_id
          AND gp.player_id = p_user_id
          AND gp.status = 'active'
      );
    END;
    $fnbody$ LANGUAGE plpgsql SECURITY DEFINER;
  $create$;

  -- Extend the SELECT policy: creator OR public OR an active member of a game using the ruleset.
  EXECUTE format('DROP POLICY IF EXISTS %I ON rulesets', policy_name);
  EXECUTE format(
    'CREATE POLICY %I ON rulesets FOR SELECT USING (created_by = auth.uid() OR is_public = true OR user_can_access_ruleset(auth.uid(), rulesets.id))',
    policy_name
  );
END
$do$;
