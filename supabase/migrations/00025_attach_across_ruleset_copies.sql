-- HeistMind — UX round 3: "Bring to a campaign" across copies of the same ruleset + join errors as 4xx.
--
-- CI re-applies EVERY migration 00001..N on every deploy (no history table — see 00022's header),
-- so this file is CREATE OR REPLACE only and must stay idempotent forever. It runs AFTER 00023, so
-- the attach_character_to_game and redeem_invite_code it defines here are the final ones. It
-- touches only env-schema objects (no `public`/`auth` objects) and changes no table/column → no
-- `pnpm db:types` regen (the new RPC is called through the untyped-RPC cast).
--
--   1. rulesets_attach_compatible(user, from, to): may a character bound to ruleset `from` join a
--      campaign on ruleset `to`? Yes when it is the same row (00014), when `from` is the user's own
--      copy of `to` (00023's `compatibility_flags.copiedFrom`), or — NEW — when the two rows hold
--      IDENTICAL content (same `content` JSONB + schema_version). That last case is the catalog:
--      "load built-in" gives every user their own row of the same bundled system (a player builds
--      a character on their copy of Blades in the Dark, the GM runs the campaign on theirs), and
--      the two rows differ only by id/owner. Identical content means identical rules, so rebinding
--      the character to the campaign's row can't make it invalid. A customised or older-bundle
--      copy differs and stays incompatible (the web says so and points at "refresh").
--   2. attachable_games_for_character(character): the caller's active campaigns that character
--      can attach to (same predicate), minus its current one — the web's picker uses it, so the
--      UI filter and the server check can never disagree.
--   3. attach_character_to_game: 00023's behaviour, with the predicate above; still rebinds the
--      character to the campaign's ruleset. Not-found errors move from P0002 (PostgREST → HTTP
--      500) to P0001 (→ 400); the messages are unchanged.
--   4. redeem_invite_code: 00023's function verbatim except the code failures (not found /
--      revoked / no uses left / expired) raise P0001 (→ 400) instead of P0002 (→ 500). The web
--      keys its copy off the MESSAGE (joinFailureReason), which is unchanged.
--   5. Privileges: 00022 B7 discipline — no PUBLIC/anon EXECUTE; the RPCs to authenticated +
--      service_role; the helper to service_role only; pinned search_path.

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
  fn TEXT;
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Attach across ruleset copies (00025) in schema: %', target_schema;

  -- ---------------------------------------------------------------------------------------
  -- 1. The compatibility predicate (shared by the picker RPC and attach).
  -- ---------------------------------------------------------------------------------------
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION rulesets_attach_compatible(p_user UUID, p_from UUID, p_to UUID)
    RETURNS BOOLEAN AS $fnbody$
      SELECT p_from IS NOT NULL AND p_to IS NOT NULL AND (
        p_from = p_to
        OR EXISTS (SELECT 1 FROM rulesets r
                   WHERE r.id = p_from AND r.created_by = p_user
                     AND r.compatibility_flags->>'copiedFrom' = p_to::text)
        OR EXISTS (SELECT 1 FROM rulesets a JOIN rulesets b ON b.id = p_to
                   WHERE a.id = p_from
                     AND a.content = b.content
                     AND a.schema_version IS NOT DISTINCT FROM b.schema_version)
      );
    $fnbody$ LANGUAGE sql STABLE SECURITY DEFINER;
  $create$;

  -- ---------------------------------------------------------------------------------------
  -- 2. Which of my campaigns can this character join? (owner-only; empty for anyone else)
  -- ---------------------------------------------------------------------------------------
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION attachable_games_for_character(p_character_id UUID)
    RETURNS SETOF UUID AS $fnbody$
    DECLARE
      v_user UUID := auth.uid();
    BEGIN
      IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
      END IF;
      RETURN QUERY
        SELECT g.id
        FROM characters c
        JOIN game_players gp ON gp.player_id = v_user AND gp.status = 'active'
        JOIN games g ON g.id = gp.game_id
        WHERE c.id = p_character_id
          AND c.created_by = v_user
          AND g.id IS DISTINCT FROM c.game_id
          AND rulesets_attach_compatible(v_user, c.original_ruleset_id, g.ruleset_id)
        ORDER BY g.created_at DESC;
    END;
    $fnbody$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
  $create$;

  -- ---------------------------------------------------------------------------------------
  -- 3. attach_character_to_game — 00023 + the content-equal-copy case.
  -- ---------------------------------------------------------------------------------------
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION attach_character_to_game(p_character_id UUID, p_game_id UUID)
    RETURNS characters AS $fnbody$
    DECLARE
      v_user UUID := auth.uid();
      v_char characters%ROWTYPE;
      v_game_ruleset UUID;
    BEGIN
      IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
      END IF;

      SELECT * INTO v_char FROM characters WHERE id = p_character_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Character not found' USING ERRCODE = 'P0001';
      END IF;
      IF v_char.created_by <> v_user THEN
        RAISE EXCEPTION 'Not your character' USING ERRCODE = '42501';
      END IF;
      IF NOT is_active_game_member(v_user, p_game_id) THEN
        RAISE EXCEPTION 'Not an active member of that campaign' USING ERRCODE = '42501';
      END IF;

      SELECT ruleset_id INTO v_game_ruleset FROM games WHERE id = p_game_id;
      IF v_game_ruleset IS NULL THEN
        RAISE EXCEPTION 'Campaign not found' USING ERRCODE = 'P0001';
      END IF;
      IF NOT rulesets_attach_compatible(v_user, v_char.original_ruleset_id, v_game_ruleset) THEN
        RAISE EXCEPTION 'Character ruleset does not match the campaign' USING ERRCODE = 'P0001';
      END IF;

      UPDATE characters SET game_id = p_game_id, original_ruleset_id = v_game_ruleset,
                            updated_at = NOW()
        WHERE id = p_character_id
        RETURNING * INTO v_char;
      RETURN v_char;
    END;
    $fnbody$ LANGUAGE plpgsql SECURITY DEFINER;
  $create$;

  -- ---------------------------------------------------------------------------------------
  -- 4. redeem_invite_code — 00023 verbatim, code failures as P0001 (HTTP 400, not 500).
  -- ---------------------------------------------------------------------------------------
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION redeem_invite_code(p_code TEXT)
    RETURNS game_players AS $fnbody$
    DECLARE
      v_user UUID := auth.uid();
      v_code TEXT := upper(btrim(COALESCE(p_code, '')));
      v_inv  invitations%ROWTYPE;
      v_gp   game_players%ROWTYPE;
    BEGIN
      IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
      END IF;
      IF v_code = '' THEN
        RAISE EXCEPTION 'Join code not found' USING ERRCODE = 'P0001';
      END IF;

      SELECT * INTO v_inv FROM invitations
        WHERE invite_code IS NOT NULL AND upper(invite_code) = v_code
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Join code not found' USING ERRCODE = 'P0001';
      END IF;
      IF v_inv.status = 'revoked' THEN
        RAISE EXCEPTION 'Join code was revoked' USING ERRCODE = 'P0001';
      END IF;
      IF v_inv.status = 'accepted'
         OR COALESCE(v_inv.used_count, 0) >= COALESCE(v_inv.max_uses, 1) THEN
        RAISE EXCEPTION 'Join code has no uses left' USING ERRCODE = 'P0001';
      END IF;
      IF v_inv.status <> 'pending'
         OR (v_inv.expires_at IS NOT NULL AND v_inv.expires_at < NOW()) THEN
        RAISE EXCEPTION 'Join code has expired' USING ERRCODE = 'P0001';
      END IF;

      SELECT * INTO v_gp FROM game_players WHERE game_id = v_inv.game_id AND player_id = v_user;
      IF FOUND THEN
        IF v_gp.status = 'removed' THEN
          RAISE EXCEPTION 'You were removed from this campaign' USING ERRCODE = '42501';
        END IF;
        RETURN v_gp;  -- idempotent: already a member (incl. the GM) → no use consumed
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

  -- ---------------------------------------------------------------------------------------
  -- 5. Privileges (00022 B7 discipline).
  -- ---------------------------------------------------------------------------------------
  FOREACH fn IN ARRAY ARRAY['rulesets_attach_compatible(uuid, uuid, uuid)',
                            'attachable_games_for_character(uuid)',
                            'attach_character_to_game(uuid, uuid)',
                            'redeem_invite_code(text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%s FROM PUBLIC, anon', target_schema, fn);
    IF fn = 'rulesets_attach_compatible(uuid, uuid, uuid)' THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %I.%s FROM authenticated', target_schema, fn);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%s TO authenticated', target_schema, fn);
    END IF;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%s TO service_role', target_schema, fn);
    EXECUTE format('ALTER FUNCTION %I.%s SET search_path = %I, public, extensions, pg_temp',
                   target_schema, fn, target_schema);
  END LOOP;
END
$do$;
