-- HeistMind — round 5 (P2-6): an ASSIST from another player's character is never charged.
--
-- CI re-applies EVERY migration 00001..N on every deploy (no history table — see 00022's header),
-- so this file is CREATE … IF NOT EXISTS / CREATE OR REPLACE only and must stay idempotent
-- forever. It touches only env-schema objects (no `public`/`auth` objects). It adds one table
-- (`assist_charges`) that no client reads or writes — only the definer RPC below touches it —
-- and an RPC called through the untyped-RPC cast, so no `pnpm db:types` regen is needed.
--
-- RAW (SRD, Teamwork — Assist): "Describe how you help … You take 1 stress and give them +1d."
-- The web roll panel adds the die and the engine charges the helper's stress — but RLS (rightly)
-- lets a player write only their OWN characters, so when the helper belongs to another player the
-- charge was refused (NOT_OWNER), swallowed, and nobody was told (Bo's stress stayed 0 → 0).
--
-- charge_assist_stress(p_roll_id, p_character_id, p_note) is the narrow cross-player write:
--   * the caller must be authenticated, be an active member (or GM) of the roll's campaign, and
--     be the one who made the roll — an ACTION roll, made in the last 15 minutes;
--   * the helper must be another character in that same campaign (an own character goes through
--     the normal engine write, which also handles overflow → trauma);
--   * exactly ONE charge per roll (assist_charges.roll_id is the primary key) → no replay;
--   * it only ever adds exactly +1 stress, and only while that stays BELOW the ruleset's base
--     stress max (content.stress.max, default 9). Ability/crew stress boxes only RAISE the
--     overflow point, so below the base max can never be an overflow. At/over it the charge would
--     (or might) mark the last box → trauma, which is the owner's moment (they pick the
--     condition): the RPC writes nothing and returns 'near_limit', and the roller is told to have
--     the helper mark it on their own sheet;
--   * it logs a note row for the helper's character (the roller's localized copy, ≤ 300 chars),
--     so the charge is visible in the campaign log to everyone, including the helper.
-- Returns 'charged' | 'near_limit'. Refusals raise P0001 (bad roll / helper) or 42501 (not yours,
-- not a member) — PostgREST maps both to 4xx.
--
-- SUPERSEDED (round 6, P1-1 / F105): this version never checked that the roll HAD an assist, or
-- whose, and logged the caller's free `p_note` under the helper's name. 00028 binds the charge to
-- rolls.assist_character_id and builds the note server-side; the function below is only the
-- fresh-schema bootstrap that 00028 replaces.

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Assist stress (00027) in schema: %', target_schema;

  -- ---------------------------------------------------------------------------------------
  -- 1. One charge per roll. RLS on with NO policies: invisible to anon/authenticated; only the
  --    definer RPC (table owner) reads/writes it.
  -- ---------------------------------------------------------------------------------------
  CREATE TABLE IF NOT EXISTS assist_charges (
    roll_id UUID PRIMARY KEY REFERENCES rolls(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    charged_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ALTER TABLE assist_charges ENABLE ROW LEVEL SECURITY;
  EXECUTE format('REVOKE ALL ON TABLE %I.assist_charges FROM PUBLIC, anon, authenticated',
                 target_schema);
  EXECUTE format('GRANT ALL ON TABLE %I.assist_charges TO service_role', target_schema);

  -- ---------------------------------------------------------------------------------------
  -- 2. The narrow cross-player charge. Created only when MISSING: 00028 (round 6, P1-1) replaces
  --    it with the version bound to the roll's recorded assist, and this file re-runs BEFORE
  --    00028 on every deploy — an unconditional CREATE OR REPLACE here would put the unbound
  --    body back for the seconds between the two. (On a fresh schema this creates it and 00028
  --    replaces it in the same deploy.)
  -- ---------------------------------------------------------------------------------------
  IF to_regprocedure(format('%I.charge_assist_stress(uuid, uuid, text)', target_schema)) IS NULL THEN
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION charge_assist_stress(p_roll_id UUID, p_character_id UUID,
                                                    p_note TEXT DEFAULT NULL)
    RETURNS TEXT AS $fnbody$
    DECLARE
      v_user   UUID := auth.uid();
      v_roll   rolls%ROWTYPE;
      v_char   characters%ROWTYPE;
      v_max    INTEGER;
      v_stress INTEGER;
      v_raw    JSONB;
    BEGIN
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
        -- The last box (→ trauma) is the owner's call; nothing written. The charge row stays, so
        -- the roll can't be re-tried into a forced overflow.
        RETURN 'near_limit';
      END IF;

      UPDATE characters
        SET character_data = jsonb_set(COALESCE(character_data, '{}'::jsonb), '{stress}',
                                       to_jsonb(v_stress + 1)),
            updated_at = NOW()
        WHERE id = v_char.id;

      INSERT INTO rolls (game_id, user_id, character_id, kind, label, dice, results, outcome, note,
                         score_id)
        VALUES (v_roll.game_id, v_user, v_char.id, 'note', v_char.name, 0, '{}', 'bad',
                left(COALESCE(NULLIF(btrim(p_note), ''), v_char.name || ' marked 1 stress (assist).'),
                     300),
                v_roll.score_id);
      RETURN 'charged';
    END;
    $fnbody$ LANGUAGE plpgsql SECURITY DEFINER;
  $create$;
  END IF;

  -- ---------------------------------------------------------------------------------------
  -- 3. Privileges (00022 B7 discipline).
  -- ---------------------------------------------------------------------------------------
  EXECUTE format('REVOKE ALL ON FUNCTION %I.charge_assist_stress(uuid, uuid, text) FROM PUBLIC, anon',
                 target_schema);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %I.charge_assist_stress(uuid, uuid, text) TO authenticated',
                 target_schema);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %I.charge_assist_stress(uuid, uuid, text) TO service_role',
                 target_schema);
  EXECUTE format('ALTER FUNCTION %I.charge_assist_stress(uuid, uuid, text) '
                 'SET search_path = %I, public, extensions, pg_temp', target_schema, target_schema);
END
$do$;
