-- HeistMind — launch product round (F94): join links, membership controls, deletes.
--
-- CI re-applies EVERY migration 00001..N on every deploy (no history table — see 00022's header),
-- so this file is CREATE OR REPLACE / DROP-then-CREATE only and must stay idempotent forever. It
-- runs AFTER 00022 on every deploy, so the redeem_invite_code it defines here is the final one.
-- It touches only env-schema objects (no `public`/`auth` objects).
--
--   1. redeem_invite_code: join codes are CASE-INSENSITIVE (trimmed + upper-cased on both sides)
--      and every failure is SPECIFIC — not found / revoked / expired / used up / removed — so the
--      web can say what went wrong instead of "check the code". Same security shape as 00022:
--      the joined player is always auth.uid(); a removed member can't rejoin.
--   2. remove_game_player(game, player, note): GM-only. Marks the member 'removed' (the row stays,
--      so a kick can't be undone by re-redeeming a code), returns that player's characters in the
--      campaign to STANDALONE (theirs, not destroyed), and logs an optional feed note (the web
--      passes its translated copy; the label is the member's display name).
--   3. leave_game(game, note): a member leaves — their row is deleted (00022 delete policy shape),
--      their characters in the campaign return to standalone, optional feed note. The GM can't
--      leave their own campaign (they delete it instead).
--   4. games BEFORE DELETE trigger: deleting a campaign returns its characters to standalone (the
--      00014 FK is ON DELETE SET NULL). The trigger does that detach FIRST, renaming any character
--      whose name would collide with one of its owner's standalone characters (the 00014 partial
--      unique index) — otherwise a single name clash made campaign delete (and account deletion,
--      which cascades through games) fail with a 23505.
--   5. rulesets BEFORE DELETE trigger: other players' characters bound to a deleted ruleset get
--      their own private copy of it first (see section 5) — this is what lets a GM whose players
--      built characters in their campaign delete their account at all.
--
-- Delete policies needed by the web's new deletes already exist (00002): rulesets/games/characters
-- FOR DELETE by their creator. Ruleset delete stays blocked by the FKs while any campaign
-- (games.ruleset_id RESTRICT) or one of the owner's own characters (characters.
-- original_ruleset_id) still uses it — the web maps that 23503 to a clear message.
--
-- No table/column changes → no `pnpm db:types` regen needed (RPCs are called through a narrow cast).

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
  fn TEXT;
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Membership + delete controls (00023) in schema: %', target_schema;

  -- ---------------------------------------------------------------------------------------
  -- 1. redeem_invite_code — case-insensitive, specific errors.
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
        RAISE EXCEPTION 'Join code not found' USING ERRCODE = 'P0002';
      END IF;

      SELECT * INTO v_inv FROM invitations
        WHERE invite_code IS NOT NULL AND upper(invite_code) = v_code
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Join code not found' USING ERRCODE = 'P0002';
      END IF;
      IF v_inv.status = 'revoked' THEN
        RAISE EXCEPTION 'Join code was revoked' USING ERRCODE = 'P0002';
      END IF;
      IF v_inv.status = 'accepted'
         OR COALESCE(v_inv.used_count, 0) >= COALESCE(v_inv.max_uses, 1) THEN
        RAISE EXCEPTION 'Join code has no uses left' USING ERRCODE = 'P0002';
      END IF;
      IF v_inv.status <> 'pending'
         OR (v_inv.expires_at IS NOT NULL AND v_inv.expires_at < NOW()) THEN
        RAISE EXCEPTION 'Join code has expired' USING ERRCODE = 'P0002';
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
  -- 2. remove_game_player — GM-only kick; the member's characters return to standalone.
  -- ---------------------------------------------------------------------------------------
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION remove_game_player(p_game_id UUID, p_player_id UUID, p_note TEXT DEFAULT NULL)
    RETURNS game_players AS $fnbody$
    DECLARE
      v_user UUID := auth.uid();
      v_gp   game_players%ROWTYPE;
      r      RECORD;
      v_name TEXT;
      n      INTEGER;
    BEGIN
      IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
      END IF;
      IF NOT is_game_gm(v_user, p_game_id) THEN
        RAISE EXCEPTION 'Only the GM can remove players' USING ERRCODE = '42501';
      END IF;
      IF p_player_id = v_user THEN
        RAISE EXCEPTION 'The GM can''t remove themselves' USING ERRCODE = 'P0001';
      END IF;

      SELECT * INTO v_gp FROM game_players
        WHERE game_id = p_game_id AND player_id = p_player_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Not a member of this campaign' USING ERRCODE = 'P0002';
      END IF;

      UPDATE game_players SET status = 'removed'
        WHERE id = v_gp.id RETURNING * INTO v_gp;

      -- Their characters go back to them as standalone (renamed on a standalone-name clash).
      FOR r IN SELECT id, created_by, name FROM characters
               WHERE game_id = p_game_id AND created_by = p_player_id FOR UPDATE LOOP
        v_name := r.name; n := 1;
        WHILE EXISTS (SELECT 1 FROM characters
                      WHERE created_by = r.created_by AND game_id IS NULL AND name = v_name) LOOP
          n := n + 1; v_name := r.name || ' (' || n || ')';
        END LOOP;
        UPDATE characters SET game_id = NULL, name = v_name, updated_at = NOW() WHERE id = r.id;
      END LOOP;

      IF p_note IS NOT NULL AND btrim(p_note) <> '' THEN
        INSERT INTO rolls (game_id, user_id, kind, label, dice, results, outcome, note)
          VALUES (p_game_id, v_user, 'note',
                  (SELECT username FROM public.profiles WHERE id = p_player_id),
                  0, '{}', 'bad', left(btrim(p_note), 500));
      END IF;
      RETURN v_gp;
    END;
    $fnbody$ LANGUAGE plpgsql SECURITY DEFINER;
  $create$;

  -- ---------------------------------------------------------------------------------------
  -- 3. leave_game — a member leaves; their characters return to standalone.
  -- ---------------------------------------------------------------------------------------
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION leave_game(p_game_id UUID, p_note TEXT DEFAULT NULL)
    RETURNS VOID AS $fnbody$
    DECLARE
      v_user UUID := auth.uid();
      v_gp   game_players%ROWTYPE;
      r      RECORD;
      v_name TEXT;
      n      INTEGER;
    BEGIN
      IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
      END IF;
      IF is_game_gm(v_user, p_game_id) THEN
        RAISE EXCEPTION 'The GM can''t leave their own campaign — delete it instead'
          USING ERRCODE = 'P0001';
      END IF;
      SELECT * INTO v_gp FROM game_players
        WHERE game_id = p_game_id AND player_id = v_user FOR UPDATE;
      IF NOT FOUND OR v_gp.status = 'removed' THEN
        RAISE EXCEPTION 'Not a member of this campaign' USING ERRCODE = 'P0002';
      END IF;

      -- Log while still a member (the note is attributed to the leaver).
      IF p_note IS NOT NULL AND btrim(p_note) <> '' AND v_gp.status = 'active' THEN
        INSERT INTO rolls (game_id, user_id, kind, label, dice, results, outcome, note)
          VALUES (p_game_id, v_user, 'note',
                  (SELECT username FROM public.profiles WHERE id = v_user),
                  0, '{}', 'bad', left(btrim(p_note), 500));
      END IF;

      FOR r IN SELECT id, created_by, name FROM characters
               WHERE game_id = p_game_id AND created_by = v_user FOR UPDATE LOOP
        v_name := r.name; n := 1;
        WHILE EXISTS (SELECT 1 FROM characters
                      WHERE created_by = r.created_by AND game_id IS NULL AND name = v_name) LOOP
          n := n + 1; v_name := r.name || ' (' || n || ')';
        END LOOP;
        UPDATE characters SET game_id = NULL, name = v_name, updated_at = NOW() WHERE id = r.id;
      END LOOP;

      DELETE FROM game_players WHERE id = v_gp.id;
    END;
    $fnbody$ LANGUAGE plpgsql SECURITY DEFINER;
  $create$;

  -- ---------------------------------------------------------------------------------------
  -- 4. Campaign delete → characters detach to standalone (collision-safe), before the FK runs.
  --    A trigger function (RETURNS trigger) can't be invoked over the API, so no auth check is
  --    needed beyond the games DELETE policy that let the statement through.
  -- ---------------------------------------------------------------------------------------
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION games_detach_characters()
    RETURNS trigger AS $fnbody$
    DECLARE
      r      RECORD;
      v_name TEXT;
      n      INTEGER;
    BEGIN
      FOR r IN SELECT id, created_by, name FROM characters WHERE game_id = OLD.id FOR UPDATE LOOP
        v_name := r.name; n := 1;
        WHILE EXISTS (SELECT 1 FROM characters
                      WHERE created_by = r.created_by AND game_id IS NULL AND name = v_name) LOOP
          n := n + 1; v_name := r.name || ' (' || n || ')';
        END LOOP;
        UPDATE characters SET game_id = NULL, name = v_name, updated_at = NOW() WHERE id = r.id;
      END LOOP;
      RETURN OLD;
    END;
    $fnbody$ LANGUAGE plpgsql SECURITY DEFINER;
  $create$;
  EXECUTE 'DROP TRIGGER IF EXISTS games_detach_characters ON games';
  EXECUTE 'CREATE TRIGGER games_detach_characters BEFORE DELETE ON games '
       || 'FOR EACH ROW EXECUTE FUNCTION games_detach_characters()';

  -- ---------------------------------------------------------------------------------------
  -- 5. Ruleset delete → OTHER players' characters bound to it get their own copy first.
  --    A player's character in your campaign is bound to YOUR ruleset (characters.
  --    original_ruleset_id, NO ACTION). Once the campaign is gone (deleted, or cascaded away by
  --    account deletion) that FK made deleting the ruleset — and so deleting the GM's ACCOUNT —
  --    fail, and left the player's sheet pointing at a ruleset they can no longer read. Now each
  --    such player receives an exact private copy (name kept, or suffixed on a clash) and their
  --    characters are re-bound to it. The owner's OWN characters and any campaign still on the
  --    ruleset keep blocking a direct delete (the web explains that).
  -- ---------------------------------------------------------------------------------------
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION rulesets_rehome_characters()
    RETURNS trigger AS $fnbody$
    DECLARE
      r      RECORD;
      v_name TEXT;
      v_new  UUID;
      n      INTEGER;
    BEGIN
      FOR r IN SELECT DISTINCT created_by FROM characters
               WHERE original_ruleset_id = OLD.id AND created_by <> OLD.created_by LOOP
        v_name := OLD.name; n := 1;
        WHILE EXISTS (SELECT 1 FROM rulesets WHERE created_by = r.created_by AND name = v_name) LOOP
          n := n + 1; v_name := OLD.name || ' (' || n || ')';
        END LOOP;
        INSERT INTO rulesets (created_by, name, description, version, content, schema_version,
                              status, is_public, tags, compatibility_flags)
          VALUES (r.created_by, v_name, OLD.description, OLD.version, OLD.content,
                  OLD.schema_version, OLD.status, false, OLD.tags, OLD.compatibility_flags)
          RETURNING id INTO v_new;
        UPDATE characters SET original_ruleset_id = v_new
          WHERE original_ruleset_id = OLD.id AND created_by = r.created_by;
      END LOOP;
      RETURN OLD;
    END;
    $fnbody$ LANGUAGE plpgsql SECURITY DEFINER;
  $create$;
  EXECUTE 'DROP TRIGGER IF EXISTS rulesets_rehome_characters ON rulesets';
  EXECUTE 'CREATE TRIGGER rulesets_rehome_characters BEFORE DELETE ON rulesets '
       || 'FOR EACH ROW EXECUTE FUNCTION rulesets_rehome_characters()';

  -- ---------------------------------------------------------------------------------------
  -- 6. Privileges (00022 B7 discipline): no PUBLIC/anon EXECUTE, authenticated + service_role
  --    for the RPCs, service_role only for the trigger function; pinned search_path everywhere.
  -- ---------------------------------------------------------------------------------------
  FOREACH fn IN ARRAY ARRAY['redeem_invite_code(text)', 'remove_game_player(uuid, uuid, text)',
                            'leave_game(uuid, text)', 'games_detach_characters()',
                            'rulesets_rehome_characters()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%s FROM PUBLIC, anon', target_schema, fn);
    IF fn IN ('games_detach_characters()', 'rulesets_rehome_characters()') THEN
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
