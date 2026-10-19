-- HeistMind — round 4 (P1-N1): campaigns silently capped at 5 players + the GM.
--
-- CI re-applies EVERY migration 00001..N on every deploy (no history table — see 00022's header),
-- so this file is CREATE OR REPLACE / DROP-then-CREATE only and must stay idempotent forever. It
-- runs AFTER 00025, so the redeem_invite_code and accept_invitation it defines here are the final
-- ones. It touches only env-schema objects (no `public`/`auth` objects) and adds no table/column
-- (only a default, a CHECK bound and a column comment) → no `pnpm db:types` regen.
--
-- What was wrong: `games.max_players` defaulted to 6 and counts EVERY active seat — the GM's too
-- (update_game_player_count counts game_master + player + co_gm). Nobody could see or change it,
-- so the 6th player's join hit `CHECK (current_players <= max_players)` inside the player-count
-- trigger → 23514 → "Something went wrong joining. Try again", while the hub promised "Each code
-- lets up to 20 players in".
--
-- The model (RAW-agnostic — FitD sets no table size): `max_players` keeps its meaning (seats,
-- GM included) so the existing trigger + CHECK stay the enforcement; the web shows it as a PLAYER
-- limit (seats − 1) and the GM sets it on the hub, 1…30 players.
--
--   1. Bounds: CHECK max_players BETWEEN 1 AND 31 (the GM + up to 30 players; was ≤ 20).
--      Default 21 (the GM + 20 players), so a fresh campaign never undercuts one join code (20
--      uses). The adapter stops sending its own `?? 6`, so the DB default applies.
--   2. One-shot backfill: every existing campaign still on the old default (6) moves to 21. No GM
--      could ever set the value (there was no UI, and the bot never writes it), so a 6 is always
--      the old default — but once this ships a GM CAN choose 6 (5 players). The backfill must
--      therefore run exactly once per schema: it is latched by a comment on the column, which the
--      re-applied file checks before touching any row.
--   3. A GM lowering the limit below the players already in → a clear P0001 (HTTP 400) instead of
--      the raw 23514 (games_guard_player_limit, BEFORE UPDATE OF max_players).
--   4. redeem_invite_code: 00025 verbatim + a capacity check that locks the campaign row first
--      (concurrent joins serialize on it instead of racing into the CHECK) and raises
--      'Campaign is full' as P0001 (→ 400). It runs AFTER the already-a-member short-circuit, so a
--      member re-opening their link is never told the campaign is full. No use is consumed.
--   5. accept_invitation (targeted invites): 00022 verbatim + the same capacity check.
--   6. Privileges (00022 B7 discipline): no PUBLIC/anon EXECUTE; the RPCs to authenticated +
--      service_role; pinned search_path (CREATE OR REPLACE resets a function's SET clauses).

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
  check_name TEXT := target_schema || '_games_max_players_check';
  latch TEXT := 'heistmind:00026 player-limit backfill applied';
  fn TEXT;
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Campaign player limit (00026) in schema: %', target_schema;

  -- ---------------------------------------------------------------------------------------
  -- 1. Bounds + default. Same constraint NAME as 00002 (whose IF NOT EXISTS then skips it on
  --    re-apply); only rebuilt when its definition isn't already the new one.
  -- ---------------------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conname = check_name
      AND c.conrelid = format('%I.games', target_schema)::regclass
      AND pg_get_constraintdef(c.oid) LIKE '%<= 31%'
  ) THEN
    EXECUTE format('ALTER TABLE games DROP CONSTRAINT IF EXISTS %I', check_name);
    EXECUTE format('ALTER TABLE games ADD CONSTRAINT %I CHECK (max_players >= 1 AND max_players <= 31)',
                   check_name);
  END IF;
  EXECUTE 'ALTER TABLE games ALTER COLUMN max_players SET DEFAULT 21';

  -- ---------------------------------------------------------------------------------------
  -- 2. One-shot backfill of the old default, latched by the column comment.
  -- ---------------------------------------------------------------------------------------
  IF col_description(format('%I.games', target_schema)::regclass,
                     (SELECT attnum FROM pg_attribute
                      WHERE attrelid = format('%I.games', target_schema)::regclass
                        AND attname = 'max_players')) IS DISTINCT FROM latch THEN
    UPDATE games SET max_players = 21 WHERE max_players = 6 OR max_players IS NULL;
    EXECUTE format('COMMENT ON COLUMN %I.games.max_players IS %L', target_schema, latch);
    RAISE NOTICE 'Backfilled the old 6-seat default to 21 in %', target_schema;
  END IF;

  -- ---------------------------------------------------------------------------------------
  -- 3. A limit below the seats already taken → a specific refusal (not the raw CHECK 23514).
  -- ---------------------------------------------------------------------------------------
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION games_guard_player_limit()
    RETURNS trigger AS $fnbody$
    BEGIN
      IF NEW.max_players IS DISTINCT FROM OLD.max_players
         AND NEW.max_players < COALESCE(NEW.current_players, 0) THEN
        RAISE EXCEPTION 'Player limit is below the players already in the campaign'
          USING ERRCODE = 'P0001',
                DETAIL = format('%s seats are taken (the GM included).', NEW.current_players);
      END IF;
      RETURN NEW;
    END;
    $fnbody$ LANGUAGE plpgsql;
  $create$;
  EXECUTE 'DROP TRIGGER IF EXISTS games_guard_player_limit ON games';
  EXECUTE 'CREATE TRIGGER games_guard_player_limit BEFORE UPDATE OF max_players ON games '
       || 'FOR EACH ROW EXECUTE FUNCTION games_guard_player_limit()';

  -- ---------------------------------------------------------------------------------------
  -- 4. redeem_invite_code — 00025 + the capacity check.
  -- ---------------------------------------------------------------------------------------
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION redeem_invite_code(p_code TEXT)
    RETURNS game_players AS $fnbody$
    DECLARE
      v_user UUID := auth.uid();
      v_code TEXT := upper(btrim(COALESCE(p_code, '')));
      v_inv  invitations%ROWTYPE;
      v_gp   game_players%ROWTYPE;
      v_game games%ROWTYPE;
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

      -- Capacity: lock the campaign row so concurrent joins queue here instead of racing into
      -- the current_players CHECK (which the player-count trigger would hit as a raw 23514).
      SELECT * INTO v_game FROM games WHERE id = v_inv.game_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Join code not found' USING ERRCODE = 'P0001';
      END IF;
      IF COALESCE(v_game.current_players, 0) >= COALESCE(v_game.max_players, 21) THEN
        RAISE EXCEPTION 'Campaign is full'
          USING ERRCODE = 'P0001',
                DETAIL = format('%s of %s players', GREATEST(COALESCE(v_game.current_players, 0) - 1, 0),
                                GREATEST(COALESCE(v_game.max_players, 21) - 1, 0));
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
  -- 5. accept_invitation — 00022 + the capacity check (only when a seat is newly taken).
  -- ---------------------------------------------------------------------------------------
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION accept_invitation(p_invitation_id UUID)
    RETURNS game_players AS $fnbody$
    DECLARE
      v_user UUID := auth.uid();
      v_inv  invitations%ROWTYPE;
      v_gp   game_players%ROWTYPE;
      v_game games%ROWTYPE;
      v_takes_seat BOOLEAN;
    BEGIN
      IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
      END IF;
      SELECT * INTO v_inv FROM invitations WHERE id = p_invitation_id FOR UPDATE;
      IF NOT FOUND OR v_inv.invited_player IS DISTINCT FROM v_user OR v_inv.status <> 'pending' THEN
        RAISE EXCEPTION 'Invitation not found or no longer pending' USING ERRCODE = 'P0002';
      END IF;
      IF v_inv.expires_at IS NOT NULL AND v_inv.expires_at < NOW() THEN
        RAISE EXCEPTION 'Invitation has expired' USING ERRCODE = 'P0002';
      END IF;

      SELECT * INTO v_gp FROM game_players WHERE game_id = v_inv.game_id AND player_id = v_user;
      IF FOUND AND v_gp.status = 'removed' THEN
        RAISE EXCEPTION 'You were removed from this campaign' USING ERRCODE = '42501';
      END IF;
      v_takes_seat := NOT FOUND OR v_gp.status <> 'active';
      IF v_takes_seat THEN
        SELECT * INTO v_game FROM games WHERE id = v_inv.game_id FOR UPDATE;
        IF COALESCE(v_game.current_players, 0) >= COALESCE(v_game.max_players, 21) THEN
          RAISE EXCEPTION 'Campaign is full' USING ERRCODE = 'P0001';
        END IF;
      END IF;

      IF v_gp.id IS NOT NULL THEN
        IF v_gp.status <> 'active' THEN
          UPDATE game_players SET status = 'active', joined_at = NOW()
            WHERE id = v_gp.id RETURNING * INTO v_gp;
        END IF;
      ELSE
        INSERT INTO game_players (game_id, player_id, role, status, joined_at)
          VALUES (v_inv.game_id, v_user, 'player', 'active', NOW())
          RETURNING * INTO v_gp;
      END IF;

      UPDATE invitations
        SET status = 'accepted', used_count = COALESCE(used_count, 0) + 1, responded_at = NOW()
        WHERE id = v_inv.id;
      RETURN v_gp;
    END;
    $fnbody$ LANGUAGE plpgsql SECURITY DEFINER;
  $create$;

  -- ---------------------------------------------------------------------------------------
  -- 6. Privileges (00022 B7 discipline).
  -- ---------------------------------------------------------------------------------------
  FOREACH fn IN ARRAY ARRAY['redeem_invite_code(text)', 'accept_invitation(uuid)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%s FROM PUBLIC, anon', target_schema, fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%s TO authenticated', target_schema, fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%s TO service_role', target_schema, fn);
    EXECUTE format('ALTER FUNCTION %I.%s SET search_path = %I, public, extensions, pg_temp',
                   target_schema, fn, target_schema);
  END LOOP;
  -- The guard is a plain (invoker) trigger function — nobody calls it directly.
  EXECUTE format('REVOKE ALL ON FUNCTION %I.games_guard_player_limit() FROM PUBLIC, anon',
                 target_schema);
  EXECUTE format('ALTER FUNCTION %I.games_guard_player_limit() SET search_path = %I, public, pg_temp',
                 target_schema, target_schema);
END
$do$;
