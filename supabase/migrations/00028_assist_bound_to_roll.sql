-- HeistMind — round 6 (P1-1, F105): an assist charge is bound to the assist RECORDED on the roll.
--
-- CI re-applies EVERY migration 00001..N on every deploy (no history table — see 00022's header),
-- so this file is ADD COLUMN IF NOT EXISTS / CREATE OR REPLACE / DROP+CREATE TRIGGER only and must
-- stay idempotent forever. It touches only env-schema objects (no `public`/`auth` objects).
-- New column → `packages/database/src/supabase-types.ts` updated alongside.
--
-- The hole (round-6 review, P1-1): 00027's charge_assist_stress checked that the caller made a
-- recent action roll in a campaign they belong to and that the helper was someone else's character
-- there — but never that the roll HAD an assist, or that it was THIS helper's. Any member could
-- insert bare characterless action rolls over REST and charge each one to another player's
-- character (0 → 8, one box from trauma), and the free `p_note` was logged as that character's
-- own note row (impersonation in the campaign log).
--
-- What this file does:
--   1. rolls.assist_character_id — the helper, written WITH the roll (the engine sets it from
--      ActionRollInput.assist). Validated on insert by its own trigger (rolls_guard_assist, kept
--      separate from 00022's rolls_guard_insert so a re-run of 00022 can never drop it):
--        * only an ACTION roll takes an assist, and only one rolled WITH a character (RAW: a
--          teammate helps a character act) — the roll's character is already held to "yours, or
--          you GM this campaign" by rolls_guard_insert for client writes;
--        * the helper is a character IN that roll's campaign, and not the rolling character.
--      Rolls are append-only for clients (no UPDATE grant, 00005), so the column can't be
--      rewritten after the fact.
--   2. charge_assist_stress(p_roll_id, p_character_id, p_note) — same signature (old clients keep
--      working), now additionally requires:
--        * v_roll.assist_character_id = p_character_id (a bare roll / another helper → refused);
--        * the roll's own character exists and is the caller's (or the caller GMs the campaign);
--      and keeps 00027's: authenticated, the caller made the roll, an action roll, < 15 minutes
--      old, active member, helper in the campaign and not the caller's, ONE charge per roll,
--      +1 only while below the ruleset's base stress max (else 'near_limit', nothing written).
--   3. The log note is built HERE from trusted names; `p_note` is accepted and IGNORED:
--        charged    → "<helper> marked 1 stress assisting <roller>."
--        near_limit → "<helper> owes 1 stress for assisting <roller> — …" (round-6 P2-2: the
--                     helper is told; before, nothing in the log said they owed it).
--      The row's user_id is the roller (the author), character_id/label the helper (who it's
--      about), and the text names both — no caller-controlled text under someone else's name.
--   (00027 is also edited at the source to create its function only when missing, so a deploy's
--   re-run of 00027 can't transiently put the unbound version back before this file runs.)
-- Returns 'charged' | 'near_limit'. Refusals raise P0001 (bad roll / helper) or 42501 (not yours,
-- not a member) — PostgREST maps both to 4xx.

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Assist bound to roll (00028) in schema: %', target_schema;

  -- ---------------------------------------------------------------------------------------
  -- 1. The helper, recorded on the roll.
  -- ---------------------------------------------------------------------------------------
  EXECUTE 'ALTER TABLE rolls ADD COLUMN IF NOT EXISTS assist_character_id UUID '
       || 'REFERENCES characters(id) ON DELETE SET NULL';

  EXECUTE $create$
    CREATE OR REPLACE FUNCTION rolls_guard_assist()
    RETURNS trigger AS $fnbody$
    DECLARE
      v_game UUID;
    BEGIN
      IF NEW.assist_character_id IS NULL THEN
        RETURN NEW;
      END IF;
      IF NEW.kind IS DISTINCT FROM 'action' THEN
        RAISE EXCEPTION 'Only an action roll takes an assist' USING ERRCODE = '23514';
      END IF;
      IF NEW.character_id IS NULL THEN
        RAISE EXCEPTION 'An assist helps a character''s roll' USING ERRCODE = '23514';
      END IF;
      IF NEW.assist_character_id = NEW.character_id THEN
        RAISE EXCEPTION 'A character can''t assist its own roll' USING ERRCODE = '23514';
      END IF;
      -- Invoker: a client sees only characters RLS lets it read — an unreadable helper is refused.
      SELECT game_id INTO v_game FROM characters WHERE id = NEW.assist_character_id;
      IF NOT FOUND OR v_game IS DISTINCT FROM NEW.game_id THEN
        RAISE EXCEPTION 'The assisting character is not in this campaign' USING ERRCODE = '23514';
      END IF;
      RETURN NEW;
    END;
    $fnbody$ LANGUAGE plpgsql;
  $create$;
  EXECUTE 'DROP TRIGGER IF EXISTS rolls_guard_assist ON rolls';
  EXECUTE 'CREATE TRIGGER rolls_guard_assist BEFORE INSERT ON rolls '
       || 'FOR EACH ROW EXECUTE FUNCTION rolls_guard_assist()';

  -- ---------------------------------------------------------------------------------------
  -- 2. The cross-player charge, bound to the recorded assist; the note is built server-side.
  -- ---------------------------------------------------------------------------------------
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION charge_assist_stress(p_roll_id UUID, p_character_id UUID,
                                                    p_note TEXT DEFAULT NULL)
    RETURNS TEXT AS $fnbody$
    DECLARE
      v_user   UUID := auth.uid();
      v_roll   rolls%ROWTYPE;
      v_roller characters%ROWTYPE;
      v_char   characters%ROWTYPE;
      v_max    INTEGER;
      v_stress INTEGER;
      v_raw    JSONB;
      v_note   TEXT;
    BEGIN
      -- p_note is accepted for signature compatibility and deliberately ignored (00028).
      IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
      END IF;

      SELECT * INTO v_roll FROM rolls WHERE id = p_roll_id;
      IF NOT FOUND OR v_roll.user_id IS DISTINCT FROM v_user THEN
        RAISE EXCEPTION 'Roll not found' USING ERRCODE = 'P0001';
      END IF;
      IF v_roll.kind <> 'action' THEN
        RAISE EXCEPTION 'Only an action roll takes an assist' USING ERRCODE = 'P0001';
      END IF;
      IF v_roll.created_at < NOW() - INTERVAL '15 minutes' THEN
        RAISE EXCEPTION 'That roll is too old to charge an assist' USING ERRCODE = 'P0001';
      END IF;
      IF NOT is_active_game_member(v_user, v_roll.game_id) THEN
        RAISE EXCEPTION 'Not an active member of that campaign' USING ERRCODE = '42501';
      END IF;

      -- 00028: the charge must match the assist RECORDED on the roll.
      IF v_roll.assist_character_id IS NULL THEN
        RAISE EXCEPTION 'That roll had no assist' USING ERRCODE = 'P0001';
      END IF;
      IF v_roll.assist_character_id IS DISTINCT FROM p_character_id THEN
        RAISE EXCEPTION 'That character didn''t assist this roll' USING ERRCODE = 'P0001';
      END IF;
      SELECT * INTO v_roller FROM characters WHERE id = v_roll.character_id;
      IF v_roll.character_id IS NULL OR NOT FOUND
         OR (v_roller.created_by IS DISTINCT FROM v_user
             AND NOT is_game_gm(v_user, v_roll.game_id)) THEN
        RAISE EXCEPTION 'Only your own character''s roll takes an assist' USING ERRCODE = '42501';
      END IF;

      SELECT * INTO v_char FROM characters WHERE id = p_character_id FOR UPDATE;
      IF NOT FOUND OR v_char.game_id IS DISTINCT FROM v_roll.game_id THEN
        RAISE EXCEPTION 'The assisting character is not in this campaign' USING ERRCODE = 'P0001';
      END IF;
      IF v_char.created_by = v_user OR v_char.id = v_roll.character_id THEN
        RAISE EXCEPTION 'Mark your own character''s stress on its sheet' USING ERRCODE = 'P0001';
      END IF;

      -- One charge per roll: a replay (or a second helper on the same roll) is refused.
      INSERT INTO assist_charges (roll_id, character_id, charged_by)
        VALUES (p_roll_id, p_character_id, v_user)
        ON CONFLICT (roll_id) DO NOTHING;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'This roll''s assist was already charged' USING ERRCODE = 'P0001';
      END IF;

      SELECT CASE WHEN jsonb_typeof(r.content->'stress'->'max') = 'number'
                  THEN (r.content->'stress'->>'max')::numeric::int ELSE 9 END
        INTO v_max
        FROM rulesets r WHERE r.id = v_char.original_ruleset_id;
      v_max := COALESCE(v_max, 9);
      v_raw := v_char.character_data->'stress';
      v_stress := CASE WHEN jsonb_typeof(v_raw) = 'number' THEN floor((v_raw #>> '{}')::numeric)::int
                       ELSE 0 END;

      IF v_stress + 1 >= v_max THEN
        -- The last box (→ trauma) is the owner's call; their stress is untouched. The charge row
        -- stays, so the roll can't be re-tried into a forced overflow. The log tells the helper.
        v_note := v_char.name || ' owes 1 stress for assisting ' || v_roller.name
               || ' — one box from trauma, so it''s theirs to mark on their own sheet.';
      ELSE
        UPDATE characters
          SET character_data = jsonb_set(COALESCE(character_data, '{}'::jsonb), '{stress}',
                                         to_jsonb(v_stress + 1)),
              updated_at = NOW()
          WHERE id = v_char.id;
        v_note := v_char.name || ' marked 1 stress assisting ' || v_roller.name || '.';
      END IF;

      INSERT INTO rolls (game_id, user_id, character_id, kind, label, dice, results, outcome, note,
                         score_id)
        VALUES (v_roll.game_id, v_user, v_char.id, 'note', v_char.name, 0, '{}', 'bad',
                left(v_note, 300), v_roll.score_id);
      RETURN CASE WHEN v_stress + 1 >= v_max THEN 'near_limit' ELSE 'charged' END;
    END;
    $fnbody$ LANGUAGE plpgsql SECURITY DEFINER;
  $create$;

  -- ---------------------------------------------------------------------------------------
  -- 3. Privileges (00022 B7 discipline) — restated for both functions this file owns.
  -- ---------------------------------------------------------------------------------------
  EXECUTE format('REVOKE ALL ON FUNCTION %I.charge_assist_stress(uuid, uuid, text) FROM PUBLIC, anon',
                 target_schema);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %I.charge_assist_stress(uuid, uuid, text) TO authenticated',
                 target_schema);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %I.charge_assist_stress(uuid, uuid, text) TO service_role',
                 target_schema);
  EXECUTE format('ALTER FUNCTION %I.charge_assist_stress(uuid, uuid, text) '
                 'SET search_path = %I, public, extensions, pg_temp', target_schema, target_schema);
  EXECUTE format('REVOKE ALL ON FUNCTION %I.rolls_guard_assist() FROM PUBLIC, anon', target_schema);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %I.rolls_guard_assist() TO authenticated, service_role',
                 target_schema);
  EXECUTE format('ALTER FUNCTION %I.rolls_guard_assist() '
                 'SET search_path = %I, public, extensions, pg_temp', target_schema, target_schema);
END
$do$;
