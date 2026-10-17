-- HeistMind — launch security hardening (security review, F89). The final authoritative state
-- for every object below: CI re-applies EVERY migration 00001..N on every deploy (no history
-- table), so this file unconditionally DROP/CREATEs what it owns and must stay idempotent
-- forever. Earlier files that used to (re)create the insecure versions (00001/00019
-- handle_new_user, 00002 policies + is_game_master, 00003 grants) were also edited at the source
-- so nothing insecure is re-created even transiently mid-deploy; this file still restates it all.
--
-- What it closes (repro'd through PostgREST with the public anon key + real user JWTs):
--   1. game_players self-insert/self-update → any user could make themselves GM of any campaign
--      and un-kick themselves. Now: writes are GM-only (GM = games.created_by, never a role row),
--      joins go through redeem_invite_code / accept_invitation (SECURITY DEFINER), a player may
--      only DELETE their own row (leave), never UPDATE role/status.
--   2. profiles: emails were stored as username (Discord sends no `username` key) and every
--      profile was world-readable to anon. Now: handle_new_user derives a display name from the
--      Discord metadata (never the email), collision-safe; '@' usernames are backfilled; anon has
--      no access; authenticated may read profiles (table-level for now — see A5) and updates only
--      (username, avatar_url, preferences) on its own row — never discord_id/id.
--   3. games INSERT/ruleset change requires a ruleset the caller owns or that is public (blocked
--      the private-ruleset leak + the account-deletion FK grief). characters.game_id/created_by/
--      original_ruleset_id change only via the attach/detach RPCs. invitations UPDATE is GM-only
--      with a WITH CHECK (invitees respond via accept_invitation/decline_invitation RPCs).
--   4. SECURITY DEFINER helpers: anon loses EXECUTE on every env-schema function, the membership
--      helpers only answer about the CALLER (no role oracle), get_user_game_role is service-only,
--      every definer function gets a pinned search_path; TRUNCATE/TRIGGER/REFERENCES revoked.
--   5. rolls: a BEFORE INSERT trigger rejects a character the caller doesn't own (unless they GM
--      that campaign) and any dice roll whose outcome doesn't match its faces. Non-dice kinds
--      (note/score/clock/…, the "record a result settled elsewhere" path) are untouched.
--   6. games.discord_guild_id/discord_channel_id (and created_by/current_players) are writable
--      only by the service role (the signed bot path) — no more link squatting over REST.
--
-- SHARED-SCHEMA NOTE: the `public` objects (keepalive_probe, profiles grants/policies/constraint/
-- backfill, handle_new_user, heistmind_derive_username) are shared by the development AND
-- production env schemas, so they take effect for prod users as soon as this runs anywhere.
-- New functions/tables → `pnpm db:types` regen (committed alongside).

-- ===========================================================================================
-- A. PUBLIC SCHEMA (shared across envs) — idempotent, safe under the per-env double run.
-- ===========================================================================================

-- A1. Keepalive probe. The Greenlight keepalive Worker GETs a table with the ANON key to keep the
--     Supabase project from pausing; it used profiles, which anon can no longer read (A5). A
--     single non-PII row, readable by anyone. Created BEFORE the profiles revoke below.
CREATE TABLE IF NOT EXISTS public.keepalive_probe (id INTEGER PRIMARY KEY);
INSERT INTO public.keepalive_probe (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.keepalive_probe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "keepalive_probe is readable by everyone" ON public.keepalive_probe;
CREATE POLICY "keepalive_probe is readable by everyone"
  ON public.keepalive_probe FOR SELECT TO anon, authenticated USING (true);
REVOKE ALL ON public.keepalive_probe FROM anon, authenticated;
GRANT SELECT ON public.keepalive_probe TO anon, authenticated;
GRANT ALL ON public.keepalive_probe TO service_role;

-- A2. Display-name derivation for a new/backfilled profile. Supabase's Discord provider populates
--     raw_user_meta_data with custom_claims.global_name (the Discord display name), full_name (the
--     account handle), name ("handle#0", legacy discriminator form), provider_id/sub, picture/
--     avatar_url and email — never `username`. Test personas (admin.createUser) send `username`.
--     The email is NEVER a candidate, and any candidate containing '@' is skipped. Collision-safe
--     against profiles_username_key: a taken name gets a short suffix.
CREATE OR REPLACE FUNCTION public.heistmind_derive_username(p_meta JSONB, p_uid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_meta JSONB := COALESCE(p_meta, '{}'::jsonb);
  v_cand TEXT;
  v_base TEXT;
  v_name TEXT;
  v_try  INTEGER := 0;
BEGIN
  FOREACH v_cand IN ARRAY ARRAY[
    v_meta -> 'custom_claims' ->> 'global_name',
    v_meta ->> 'full_name',
    v_meta ->> 'name',
    v_meta ->> 'user_name',
    v_meta ->> 'username'
  ] LOOP
    v_cand := btrim(regexp_replace(COALESCE(v_cand, ''), '\s+', ' ', 'g'));
    v_cand := btrim(regexp_replace(v_cand, '#[0-9]{1,4}$', ''));
    IF v_cand <> '' AND strpos(v_cand, '@') = 0 THEN
      v_base := left(v_cand, 32);
      EXIT;
    END IF;
  END LOOP;
  IF v_base IS NULL THEN
    v_base := 'player-' || left(replace(p_uid::text, '-', ''), 8);
  END IF;

  v_name := v_base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_name AND id <> p_uid) LOOP
    v_try := v_try + 1;
    IF v_try > 20 THEN
      RETURN 'player-' || replace(p_uid::text, '-', '');
    END IF;
    v_name := left(v_base, 26) || '-' || CASE
      WHEN v_try = 1 THEN left(replace(p_uid::text, '-', ''), 5)
      ELSE substr(md5(random()::text || clock_timestamp()::text), 1, 5)
    END;
  END LOOP;
  RETURN v_name;
END;
$fn$;

-- A3. The signup trigger. Same shape as 00019 (username/avatar/discord_id), but the username is
--     derived (A2) and signup can never fail on a UNIQUE: a discord_id already held by another
--     profile is left NULL (logged), and a username race retries with a random suffix.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_meta     JSONB := COALESCE(new.raw_user_meta_data, '{}'::jsonb);
  v_username TEXT;
  v_avatar   TEXT := COALESCE(v_meta ->> 'avatar_url', v_meta ->> 'picture');
  v_discord  TEXT := NULLIF(COALESCE(v_meta ->> 'provider_id', v_meta ->> 'sub'), '');
BEGIN
  v_username := public.heistmind_derive_username(v_meta, new.id);
  IF v_discord IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.profiles WHERE discord_id = v_discord AND id <> new.id) THEN
    RAISE WARNING 'handle_new_user: discord_id already linked to another profile; leaving it unset for %', new.id;
    v_discord := NULL;
  END IF;

  BEGIN
    INSERT INTO public.profiles (id, username, avatar_url, discord_id)
    VALUES (new.id, v_username, v_avatar, v_discord)
    ON CONFLICT (id) DO UPDATE SET
      username   = COALESCE(profiles.username, EXCLUDED.username),
      avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
      discord_id = COALESCE(profiles.discord_id, EXCLUDED.discord_id),
      updated_at = TIMEZONE('utc', NOW());
  EXCEPTION WHEN unique_violation THEN
    -- A concurrent signup took the same name/snowflake between the check and the insert.
    INSERT INTO public.profiles (id, username, avatar_url, discord_id)
    VALUES (new.id,
            left(v_username, 25) || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6),
            v_avatar, NULL)
    ON CONFLICT (id) DO NOTHING;
  END;
  RETURN new;
END;
$fn$;

REVOKE ALL ON FUNCTION public.heistmind_derive_username(JSONB, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.heistmind_derive_username(JSONB, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

DO $do$
DECLARE
  r RECORD;
  fixed INTEGER := 0;
BEGIN
  -- A4. Backfill: every username that is (or contains) an email → a derived display name. Row by
  --     row so each derivation sees the names already assigned (collision-safe).
  FOR r IN
    SELECT p.id, COALESCE(u.raw_user_meta_data, '{}'::jsonb) AS meta
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE strpos(p.username, '@') > 0
  LOOP
    UPDATE public.profiles
      SET username = public.heistmind_derive_username(r.meta, r.id)
      WHERE id = r.id;
    fixed := fixed + 1;
  END LOOP;
  RAISE NOTICE 'Backfilled % email-shaped username(s)', fixed;

  -- No email-shaped username can come back (the trigger never writes one; this pins it).
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.profiles'::regclass
                   AND conname = 'profiles_username_not_email') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_not_email CHECK (username IS NULL OR strpos(username, '@') = 0);
  END IF;
END
$do$;

-- A5. profiles access. Revoke everything first (a table-level REVOKE also clears column grants),
--     then grant back what the app needs. Anon gets nothing. Writes: authenticated edits only its
--     own safe columns (never discord_id/id; INSERT is the signup trigger's job, DELETE the
--     account-deletion cascade's).
--     Reads stay TABLE-LEVEL for authenticated for now: public.profiles is shared with PROD, and
--     prod runs the `main` code that still does `select('*')` on profiles — a column-level grant
--     would 42501 every prod profile read the moment this lands on development. The emails are
--     gone (backfill + CHECK), so what other users can still see is discord_id + preferences.
--     TODO(F89): tighten to the column list with the first development→main promotion (the exact
--     SQL is in FINDINGS.md F89): REVOKE SELECT … FROM authenticated; GRANT SELECT (id, username,
--     avatar_url, created_at, updated_at) … TO authenticated.
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (username, avatar_url, preferences) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Same policy names as 00001 so its IF-NOT-EXISTS re-run never re-creates the old permissive ones.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ===========================================================================================
-- B. ENV SCHEMA (development / production via heistmind.target_schema)
-- ===========================================================================================

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
  r RECORD;
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Launch security hardening in schema: %', target_schema;

  -- ---------------------------------------------------------------------------------------
  -- B1. Authority helpers. GM authority = games.created_by, never a (formerly self-writable)
  --     game_players.role row. Each helper only answers about the CALLER (or for the service
  --     role) — asking about another user returns false/'none', so they're no longer oracles.
  --     Bodies run as owner (SECURITY DEFINER, RLS bypass → no policy recursion).
  -- ---------------------------------------------------------------------------------------
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION is_game_gm(p_user_id UUID, p_game_id UUID)
    RETURNS BOOLEAN AS $fnbody$
    BEGIN
      IF p_user_id IS DISTINCT FROM auth.uid() AND COALESCE(auth.role(), '') <> 'service_role' THEN
        RETURN false;
      END IF;
      RETURN EXISTS (SELECT 1 FROM games WHERE id = p_game_id AND created_by = p_user_id);
    END;
    $fnbody$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
  $create$;

  EXECUTE $create$
    CREATE OR REPLACE FUNCTION is_game_master(user_id UUID, game_id UUID)
    RETURNS BOOLEAN AS $fnbody$
    BEGIN
      IF is_game_master.user_id IS DISTINCT FROM auth.uid()
         AND COALESCE(auth.role(), '') <> 'service_role' THEN
        RETURN false;
      END IF;
      RETURN EXISTS (
        SELECT 1 FROM games g
        WHERE g.id = is_game_master.game_id AND g.created_by = is_game_master.user_id
      );
    END;
    $fnbody$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
  $create$;

  EXECUTE $create$
    CREATE OR REPLACE FUNCTION is_active_game_member(p_user_id UUID, p_game_id UUID)
    RETURNS BOOLEAN AS $fnbody$
    BEGIN
      IF p_user_id IS DISTINCT FROM auth.uid() AND COALESCE(auth.role(), '') <> 'service_role' THEN
        RETURN false;
      END IF;
      RETURN EXISTS (
        SELECT 1 FROM game_players
        WHERE player_id = p_user_id AND game_id = p_game_id AND status = 'active'
      );
    END;
    $fnbody$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
  $create$;

  EXECUTE $create$
    CREATE OR REPLACE FUNCTION user_can_access_ruleset(p_user_id UUID, p_ruleset_id UUID)
    RETURNS BOOLEAN AS $fnbody$
    BEGIN
      IF p_user_id IS DISTINCT FROM auth.uid() AND COALESCE(auth.role(), '') <> 'service_role' THEN
        RETURN false;
      END IF;
      RETURN EXISTS (
        SELECT 1 FROM games g JOIN game_players gp ON gp.game_id = g.id
        WHERE g.ruleset_id = p_ruleset_id AND gp.player_id = p_user_id AND gp.status = 'active'
      );
    END;
    $fnbody$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
  $create$;

  EXECUTE $create$
    CREATE OR REPLACE FUNCTION get_user_game_role(user_id UUID, game_id UUID)
    RETURNS TEXT AS $fnbody$
    DECLARE
      user_role TEXT;
    BEGIN
      IF get_user_game_role.user_id IS DISTINCT FROM auth.uid()
         AND COALESCE(auth.role(), '') <> 'service_role' THEN
        RETURN 'none';
      END IF;
      IF EXISTS (SELECT 1 FROM games g WHERE g.id = get_user_game_role.game_id
                 AND g.created_by = get_user_game_role.user_id) THEN
        RETURN 'game_master';
      END IF;
      SELECT gp.role INTO user_role FROM game_players gp
        WHERE gp.player_id = get_user_game_role.user_id
          AND gp.game_id = get_user_game_role.game_id
          AND gp.status = 'active';
      RETURN CASE WHEN user_role IS NULL THEN 'none'
                  WHEN user_role = 'game_master' THEN 'player'  -- a non-creator 'GM' row grants nothing
                  ELSE user_role END;
    END;
    $fnbody$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
  $create$;

  -- ---------------------------------------------------------------------------------------
  -- B2. game_players: GM-only writes (same policy names as 00002 → its re-run is a no-op).
  -- ---------------------------------------------------------------------------------------
  EXECUTE format('DROP POLICY IF EXISTS %I ON game_players', target_schema || '_game_players_insert_policy');
  EXECUTE format(
    'CREATE POLICY %I ON game_players FOR INSERT TO authenticated WITH CHECK ('
    || 'is_game_gm(auth.uid(), game_id) AND role <> ''game_master'')',
    target_schema || '_game_players_insert_policy');

  EXECUTE format('DROP POLICY IF EXISTS %I ON game_players', target_schema || '_game_players_update_policy');
  EXECUTE format(
    'CREATE POLICY %I ON game_players FOR UPDATE TO authenticated '
    || 'USING (is_game_gm(auth.uid(), game_id)) '
    || 'WITH CHECK (is_game_gm(auth.uid(), game_id) AND (role <> ''game_master'' OR player_id = auth.uid()))',
    target_schema || '_game_players_update_policy');

  -- A player may leave (delete their own row) — but a kicked ('removed') row stays put, so a kick
  -- can't be undone by deleting it and re-redeeming the code.
  EXECUTE format('DROP POLICY IF EXISTS %I ON game_players', target_schema || '_game_players_delete_policy');
  EXECUTE format(
    'CREATE POLICY %I ON game_players FOR DELETE TO authenticated USING ('
    || 'is_game_gm(auth.uid(), game_id) OR (player_id = auth.uid() AND status <> ''removed''))',
    target_schema || '_game_players_delete_policy');

  -- redeem_invite_code (00010) stays the public join path; a kicked member can't rejoin through it.
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

      SELECT * INTO v_gp FROM game_players WHERE game_id = v_inv.game_id AND player_id = v_user;
      IF FOUND THEN
        IF v_gp.status = 'removed' THEN
          RAISE EXCEPTION 'You were removed from this campaign' USING ERRCODE = '42501';
        END IF;
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

  -- Targeted invites: the invitee accepts/declines through these instead of self-inserting a
  -- membership row / rewriting the invitation.
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION accept_invitation(p_invitation_id UUID)
    RETURNS game_players AS $fnbody$
    DECLARE
      v_user UUID := auth.uid();
      v_inv  invitations%ROWTYPE;
      v_gp   game_players%ROWTYPE;
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
      IF FOUND THEN
        IF v_gp.status = 'removed' THEN
          RAISE EXCEPTION 'You were removed from this campaign' USING ERRCODE = '42501';
        END IF;
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

  EXECUTE $create$
    CREATE OR REPLACE FUNCTION decline_invitation(p_invitation_id UUID)
    RETURNS invitations AS $fnbody$
    DECLARE
      v_user UUID := auth.uid();
      v_inv  invitations%ROWTYPE;
    BEGIN
      IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
      END IF;
      SELECT * INTO v_inv FROM invitations WHERE id = p_invitation_id FOR UPDATE;
      IF NOT FOUND OR v_inv.invited_player IS DISTINCT FROM v_user OR v_inv.status <> 'pending' THEN
        RAISE EXCEPTION 'Invitation not found or no longer pending' USING ERRCODE = 'P0002';
      END IF;
      UPDATE invitations SET status = 'declined', responded_at = NOW()
        WHERE id = v_inv.id RETURNING * INTO v_inv;
      RETURN v_inv;
    END;
    $fnbody$ LANGUAGE plpgsql SECURITY DEFINER;
  $create$;

  -- ---------------------------------------------------------------------------------------
  -- B3. invitations UPDATE: the campaign's GM only, on both sides of the write.
  -- ---------------------------------------------------------------------------------------
  EXECUTE format('DROP POLICY IF EXISTS %I ON invitations', target_schema || '_invitations_update_policy');
  EXECUTE format(
    'CREATE POLICY %I ON invitations FOR UPDATE TO authenticated '
    || 'USING (is_game_master(auth.uid(), game_id)) WITH CHECK (is_game_master(auth.uid(), game_id))',
    target_schema || '_invitations_update_policy');

  -- ---------------------------------------------------------------------------------------
  -- B4. games: a campaign may only be created on a ruleset the caller owns or that is public;
  --     the creator keeps ownership; the trigger below guards ruleset changes + bot-owned columns.
  -- ---------------------------------------------------------------------------------------
  EXECUTE format('DROP POLICY IF EXISTS %I ON games', target_schema || '_games_insert_policy');
  EXECUTE format(
    'CREATE POLICY %I ON games FOR INSERT TO authenticated WITH CHECK ('
    || 'created_by = auth.uid() AND EXISTS (SELECT 1 FROM rulesets r WHERE r.id = ruleset_id '
    || 'AND (r.created_by = auth.uid() OR r.is_public = true)))',
    target_schema || '_games_insert_policy');

  EXECUTE format('DROP POLICY IF EXISTS %I ON games', target_schema || '_games_update_policy');
  EXECUTE format(
    'CREATE POLICY %I ON games FOR UPDATE TO authenticated '
    || 'USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid())',
    target_schema || '_games_update_policy');

  -- Invoker trigger: current_user is the API role on a client write, and the owner inside the
  -- SECURITY DEFINER paths (player-count trigger, auto-assign) / the service-role bot.
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION games_guard_write()
    RETURNS trigger AS $fnbody$
    BEGIN
      IF current_user NOT IN ('anon', 'authenticated') THEN
        RETURN NEW;
      END IF;
      IF TG_OP = 'INSERT' THEN
        IF NEW.discord_guild_id IS NOT NULL OR NEW.discord_channel_id IS NOT NULL THEN
          RAISE EXCEPTION 'Discord links are set by the bot (/heist link)' USING ERRCODE = '42501';
        END IF;
        NEW.current_players := 0;  -- maintained by update_game_player_count
      ELSE
        IF NEW.discord_guild_id IS DISTINCT FROM OLD.discord_guild_id
           OR NEW.discord_channel_id IS DISTINCT FROM OLD.discord_channel_id THEN
          RAISE EXCEPTION 'Discord links are set by the bot (/heist link)' USING ERRCODE = '42501';
        END IF;
        IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
          RAISE EXCEPTION 'A campaign''s creator cannot be changed' USING ERRCODE = '42501';
        END IF;
        IF NEW.current_players IS DISTINCT FROM OLD.current_players THEN
          RAISE EXCEPTION 'current_players is maintained by the server' USING ERRCODE = '42501';
        END IF;
      END IF;
      IF (TG_OP = 'INSERT' OR NEW.ruleset_id IS DISTINCT FROM OLD.ruleset_id)
         AND NOT EXISTS (SELECT 1 FROM rulesets r WHERE r.id = NEW.ruleset_id
                         AND (r.created_by = auth.uid() OR r.is_public = true)) THEN
        RAISE EXCEPTION 'Ruleset not found or not yours' USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END;
    $fnbody$ LANGUAGE plpgsql;
  $create$;
  EXECUTE 'DROP TRIGGER IF EXISTS games_guard_write ON games';
  EXECUTE 'CREATE TRIGGER games_guard_write BEFORE INSERT OR UPDATE ON games '
       || 'FOR EACH ROW EXECUTE FUNCTION games_guard_write()';

  -- ---------------------------------------------------------------------------------------
  -- B5. characters: owner-or-GM UPDATE gets a WITH CHECK; the campaign link, owner and ruleset
  --     binding move only through attach_character_to_game / detach_character (definer RPCs →
  --     current_user is the owner there, and FK SET NULL actions run as the owner too).
  -- ---------------------------------------------------------------------------------------
  EXECUTE format('DROP POLICY IF EXISTS %I ON characters', target_schema || '_characters_update_policy');
  EXECUTE format(
    'CREATE POLICY %I ON characters FOR UPDATE TO authenticated '
    || 'USING (created_by = auth.uid() OR is_game_master(auth.uid(), game_id)) '
    || 'WITH CHECK (created_by = auth.uid() OR is_game_master(auth.uid(), game_id))',
    target_schema || '_characters_update_policy');

  EXECUTE $create$
    CREATE OR REPLACE FUNCTION characters_guard_update()
    RETURNS trigger AS $fnbody$
    BEGIN
      IF current_user IN ('anon', 'authenticated')
         AND (NEW.game_id IS DISTINCT FROM OLD.game_id
              OR NEW.created_by IS DISTINCT FROM OLD.created_by
              OR NEW.original_ruleset_id IS DISTINCT FROM OLD.original_ruleset_id) THEN
        RAISE EXCEPTION 'A character''s campaign, owner and ruleset change only via attach/detach'
          USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END;
    $fnbody$ LANGUAGE plpgsql;
  $create$;
  EXECUTE 'DROP TRIGGER IF EXISTS characters_guard_update ON characters';
  EXECUTE 'CREATE TRIGGER characters_guard_update BEFORE UPDATE ON characters '
       || 'FOR EACH ROW EXECUTE FUNCTION characters_guard_update()';

  -- ---------------------------------------------------------------------------------------
  -- B6. rolls: integrity on insert. The outcome mapping mirrors core `rollOutcome` (dice.ts):
  --     highest die (two+ 6s = crit; 6 success; 4–5 partial; else bad); zero-dice takes the
  --     LOWEST and can't crit; no dice = bad. Enforced only for dice kinds — note/score/clock/…
  --     events (results settled elsewhere) are stored as given.
  -- ---------------------------------------------------------------------------------------
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION rolls_expected_outcome(p_results INTEGER[], p_zero_dice BOOLEAN)
    RETURNS TEXT AS $fnbody$
      SELECT CASE
        WHEN COALESCE(cardinality(p_results), 0) = 0 THEN 'bad'
        WHEN p_zero_dice THEN
          CASE WHEN (SELECT min(x) FROM unnest(p_results) x) = 6 THEN 'success'
               WHEN (SELECT min(x) FROM unnest(p_results) x) >= 4 THEN 'partial'
               ELSE 'bad' END
        WHEN (SELECT count(*) FROM unnest(p_results) x WHERE x = 6) >= 2 THEN 'crit'
        WHEN (SELECT max(x) FROM unnest(p_results) x) = 6 THEN 'success'
        WHEN (SELECT max(x) FROM unnest(p_results) x) >= 4 THEN 'partial'
        ELSE 'bad'
      END
    $fnbody$ LANGUAGE sql IMMUTABLE;
  $create$;

  EXECUTE $create$
    CREATE OR REPLACE FUNCTION rolls_guard_insert()
    RETURNS trigger AS $fnbody$
    DECLARE
      v_owner UUID;
      v_game  UUID;
    BEGIN
      IF EXISTS (SELECT 1 FROM unnest(NEW.results) x WHERE x IS NULL OR x < 1 OR x > 6) THEN
        RAISE EXCEPTION 'Roll results must be die faces 1-6' USING ERRCODE = '23514';
      END IF;
      IF NEW.kind IN ('action', 'resistance', 'fortune', 'downtime')
         AND NEW.outcome IS DISTINCT FROM
             rolls_expected_outcome(NEW.results, COALESCE(NEW.zero_dice, false)) THEN
        RAISE EXCEPTION 'Roll outcome does not match its dice' USING ERRCODE = '23514';
      END IF;
      -- Client writes only (the service-role bot asserts ownership in its authz prelude).
      IF NEW.character_id IS NOT NULL AND current_user IN ('anon', 'authenticated') THEN
        SELECT created_by, game_id INTO v_owner, v_game FROM characters WHERE id = NEW.character_id;
        IF NOT FOUND
           OR (v_owner IS DISTINCT FROM auth.uid()
               AND NOT (v_game = NEW.game_id AND is_game_gm(auth.uid(), NEW.game_id))) THEN
          RAISE EXCEPTION 'Not your character' USING ERRCODE = '42501';
        END IF;
      END IF;
      RETURN NEW;
    END;
    $fnbody$ LANGUAGE plpgsql;
  $create$;
  EXECUTE 'DROP TRIGGER IF EXISTS rolls_guard_insert ON rolls';
  EXECUTE 'CREATE TRIGGER rolls_guard_insert BEFORE INSERT ON rolls '
       || 'FOR EACH ROW EXECUTE FUNCTION rolls_guard_insert()';

  -- ---------------------------------------------------------------------------------------
  -- B7. Privileges. Every env function: no PUBLIC/anon EXECUTE, authenticated + service_role
  --     keep it (RLS policies call the helpers as the querying role), except
  --     get_user_game_role (no app caller → service-only). Every function gets a pinned
  --     search_path (definer: hijack hygiene; invoker triggers: unqualified names resolve to
  --     THIS env). No TRUNCATE/TRIGGER/REFERENCES for the API roles (TRUNCATE ignores RLS).
  -- ---------------------------------------------------------------------------------------
  FOR r IN
    SELECT format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) AS sig,
           p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = target_schema AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    IF r.proname = 'get_user_game_role' THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    EXECUTE format('ALTER FUNCTION %s SET search_path = %I, public, extensions, pg_temp',
                   r.sig, target_schema);
  END LOOP;

  EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA %I FROM anon, authenticated',
                 target_schema);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLES FROM anon, authenticated',
                 target_schema);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I REVOKE EXECUTE ON FUNCTIONS FROM anon',
                 target_schema);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %I.accept_invitation(UUID) TO authenticated', target_schema);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %I.decline_invitation(UUID) TO authenticated', target_schema);
END
$do$;
