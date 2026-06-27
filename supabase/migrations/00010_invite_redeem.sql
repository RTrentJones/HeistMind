-- HeistMind — public join-code redemption (SECURITY DEFINER).
--
-- The invitations SELECT policy (00002) only exposes a row to its invited player, the inviter, or
-- the game's GM. A user redeeming a PUBLIC invite code is none of those yet, so they cannot read the
-- row to join. This adds a SECURITY DEFINER function that looks up the code AS THE TABLE OWNER
-- (bypassing RLS), validates it, adds the CALLER (auth.uid()) to game_players, and bumps the use
-- count — so a shareable code works without weakening the invitations RLS. Targeted invites still go
-- through the normal accept() path (an invited_player = auth.uid() can already read + self-insert
-- under the 00002 policies).
--
-- Security: the joined player is always auth.uid() (a user can only ever join THEMSELVES), and the
-- function pins its own search_path so a caller can't redirect the unqualified table lookups. Mirrors
-- the SECURITY DEFINER recipe from 00004 (single DO block, env schema from heistmind.target_schema).

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);

  EXECUTE $create$
    CREATE OR REPLACE FUNCTION redeem_invite_code(p_code TEXT)
    RETURNS game_players AS $fnbody$
    DECLARE
      v_user UUID := auth.uid();
      v_inv  invitations%ROWTYPE;
      v_gp   game_players%ROWTYPE;
    BEGIN
      IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
      END IF;

      -- Look up + lock the code (bypasses the invitations SELECT policy via SECURITY DEFINER).
      SELECT * INTO v_inv FROM invitations
        WHERE invite_code = p_code AND status = 'pending'
        FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Invite code not found or no longer active' USING ERRCODE = 'P0002';
      END IF;
      IF v_inv.expires_at IS NOT NULL AND v_inv.expires_at < NOW() THEN
        RAISE EXCEPTION 'Invite code has expired' USING ERRCODE = 'P0002';
      END IF;
      IF COALESCE(v_inv.used_count, 0) >= COALESCE(v_inv.max_uses, 1) THEN
        RAISE EXCEPTION 'Invite code has no uses left' USING ERRCODE = 'P0002';
      END IF;

      -- Idempotent: already a member of this game → return the existing membership.
      SELECT * INTO v_gp FROM game_players
        WHERE game_id = v_inv.game_id AND player_id = v_user;
      IF FOUND THEN
        RETURN v_gp;
      END IF;

      INSERT INTO game_players (game_id, player_id, role, status, joined_at)
        VALUES (v_inv.game_id, v_user, 'player', 'active', NOW())
        RETURNING * INTO v_gp;

      UPDATE invitations
        SET used_count   = COALESCE(used_count, 0) + 1,
            status       = CASE WHEN COALESCE(used_count, 0) + 1 >= COALESCE(max_uses, 1)
                                THEN 'accepted' ELSE status END,
            responded_at = NOW()
        WHERE id = v_inv.id;

      RETURN v_gp;
    END;
    $fnbody$ LANGUAGE plpgsql SECURITY DEFINER;
  $create$;

  -- Pin the function's search_path so unqualified lookups always resolve to the env schema, then
  -- expose it to the API role. Default privileges (00003) don't cover a function created here later,
  -- so grant explicitly.
  EXECUTE format(
    'ALTER FUNCTION redeem_invite_code(TEXT) SET search_path = %I, public, extensions', target_schema);
  EXECUTE 'GRANT EXECUTE ON FUNCTION redeem_invite_code(TEXT) TO authenticated';
END
$do$;
