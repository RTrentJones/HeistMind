-- HeistMind — Discord identity squatting (launch security round 3, F95).
--
-- THE HOLE: handle_new_user (00019/00022) copied profiles.discord_id from
-- raw_user_meta_data ->> 'provider_id' / 'sub'. That column is USER-CONTROLLED: a plain email/
-- password signup (`supabase.auth.signUp({ email, password, options: { data } })`, enabled on the
-- hosted project) writes `data` verbatim into raw_user_meta_data. So anyone could sign up by email
-- carrying a victim's Discord snowflake, claim that discord_id, and the victim's later real Discord
-- sign-in was left with discord_id = NULL (the trigger skips a snowflake another profile holds).
-- The bot resolves a Discord interaction's user.id → profiles.discord_id, so the victim's slash
-- commands would act as the ATTACKER's account. (GoTrue even merges signup `data` into the email
-- identity's identity_data — so only a provider = 'discord' identity counts, never identity_data
-- of an email identity.)
--
-- THE RULE (this file is the final authority): profiles.discord_id holds a snowflake only when it
-- comes from a VERIFIED Discord identity — data GoTrue (or the service role) controls:
--   (a) an auth.identities row with provider = 'discord' (provider_id = the Discord user id that
--       Discord itself returned during OAuth; UNIQUE (provider_id, provider) in GoTrue), or
--   (b) auth.users.raw_app_meta_data ->> 'provider' = 'discord' with NO discord identity yet.
--       raw_app_meta_data is not writable by end users (signUp/updateUser only touch user
--       metadata); GoTrue sets provider = 'discord' at INSERT for a Discord OAuth signup (its
--       ToUserModel), where raw_user_meta_data is Discord's own claim set at that instant — the
--       identity row is inserted right AFTER the user row in the same transaction, so (a) can't
--       be seen yet when the signup trigger runs. Otherwise only the service role can set it
--       (admin API app_metadata — how the e2e Discord persona is born, see e2e/support).
--
-- Shape (why three triggers, not one):
--   1. handle_new_user (AFTER INSERT ON auth.users) — first Discord OAuth sign-in: rule (b).
--   2. heistmind_on_discord_identity (AFTER INSERT ON auth.identities) — a Discord identity added
--      to an EXISTING user: manual linkIdentity, or GoTrue's automatic linking when a Discord
--      sign-in's verified email matches an email account. Also re-asserts (1) on first sign-in
--      (a no-op then). Sets discord_id only if the profile has none AND no other profile holds it
--      (never steals — a held snowflake after this file's remediation is a verified one).
--      AFTER DELETE (unlinkIdentity) releases the snowflake again so the same Discord account can
--      be linked elsewhere; skipped while the auth user itself is being deleted (account deletion
--      cascades identities and profiles separately — touching the profile there would race it).
--   3. heistmind_on_app_metadata (AFTER UPDATE OF raw_app_meta_data ON auth.users) — the service
--      role setting app_metadata.provider = 'discord' after creation (GoTrue's admin createUser
--      applies app_metadata as a follow-up UPDATE, so the INSERT trigger sees provider = 'email').
--   The condition logic lives INSIDE the functions (no WHEN clauses) and the triggers are created
--   only-if-missing, so future changes are a CREATE OR REPLACE FUNCTION — we never need to DROP a
--   trigger on an auth table (the postgres role isn't the owner on hosted Supabase).
--
-- Remediation (idempotent, every deploy): NULL any discord_id not backed by rule (a)/(b) for its
-- own user, then (re)link every Discord identity whose profile has none and whose snowflake is now
-- free — so a squatted victim gets their link back on this deploy, not on their next sign-in.
--
-- PUBLIC-schema migration (profiles/auth are shared by the development AND production env
-- schemas — approved for security hardening). CI re-applies every file on every deploy, so this
-- stays strictly idempotent. 00019/00022 were also corrected at the source so the insecure
-- trigger body is never re-created even transiently mid-deploy. No table/column changes → no
-- `pnpm db:types` regen.

-- 1. The single definition of "verified snowflake for this user". Pass the row's metadata when
--    calling from a trigger (the NEW row), so it works inside the INSERT that creates the user.
CREATE OR REPLACE FUNCTION public.heistmind_verified_discord_id(
  p_uid UUID,
  p_app_meta JSONB,
  p_user_meta JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_id TEXT;
BEGIN
  -- (a) A Discord identity: GoTrue-written from Discord's verified response. Oldest wins.
  SELECT NULLIF(i.provider_id, '') INTO v_id
  FROM auth.identities i
  WHERE i.user_id = p_uid AND i.provider = 'discord'
  ORDER BY i.created_at ASC NULLS LAST
  LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;
  IF EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = p_uid AND i.provider = 'discord') THEN
    RETURN NULL;
  END IF;

  -- (b) GoTrue/service-role asserted a Discord signup (raw_app_meta_data is not user-writable).
  IF COALESCE(p_app_meta, '{}'::jsonb) ->> 'provider' = 'discord' THEN
    RETURN NULLIF(COALESCE(p_user_meta ->> 'provider_id', p_user_meta ->> 'sub'), '');
  END IF;

  -- Anything else (an email signup's user metadata, an email identity's identity_data) is
  -- user-controlled and NEVER yields a discord_id.
  RETURN NULL;
END;
$fn$;

-- 2. Set a profile's discord_id from a verified snowflake: fills NULL only, never steals one held
--    by another profile, never fails the auth write that called it.
CREATE OR REPLACE FUNCTION public.heistmind_link_discord_id(p_uid UUID, p_discord TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF p_uid IS NULL OR NULLIF(p_discord, '') IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE discord_id = p_discord AND id <> p_uid) THEN
    RAISE WARNING 'heistmind_link_discord_id: discord_id already linked to another profile; leaving it unset for %', p_uid;
    RETURN;
  END IF;
  BEGIN
    UPDATE public.profiles
      SET discord_id = p_discord, updated_at = TIMEZONE('utc', NOW())
      WHERE id = p_uid AND discord_id IS NULL;
  EXCEPTION WHEN unique_violation THEN
    RAISE WARNING 'heistmind_link_discord_id: concurrent link of the same discord_id; leaving it unset for %', p_uid;
  END;
END;
$fn$;

-- 3. The signup trigger — 00022's shape (derived, collision-safe username; never fails signup),
--    with discord_id ONLY from the verified rule above.
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
  v_discord  TEXT := public.heistmind_verified_discord_id(new.id, new.raw_app_meta_data, v_meta);
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

-- 4. auth.identities: link on a Discord identity INSERT; release on its DELETE.
CREATE OR REPLACE FUNCTION public.heistmind_on_discord_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF new.provider = 'discord' THEN
      PERFORM public.heistmind_link_discord_id(new.user_id, NULLIF(new.provider_id, ''));
    END IF;
    RETURN new;
  END IF;

  -- DELETE (unlinkIdentity). Skip when the auth user is gone/going (account deletion cascade).
  IF old.provider = 'discord'
     AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = old.user_id) THEN
    UPDATE public.profiles
      SET discord_id = NULL, updated_at = TIMEZONE('utc', NOW())
      WHERE id = old.user_id AND discord_id = old.provider_id;
  END IF;
  RETURN old;
END;
$fn$;

-- 5. auth.users app_metadata change → link when provider just became 'discord'.
CREATE OR REPLACE FUNCTION public.heistmind_on_app_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF COALESCE(new.raw_app_meta_data, '{}'::jsonb) ->> 'provider' = 'discord'
     AND COALESCE(old.raw_app_meta_data, '{}'::jsonb) ->> 'provider' IS DISTINCT FROM 'discord' THEN
    PERFORM public.heistmind_link_discord_id(
      new.id,
      public.heistmind_verified_discord_id(new.id, new.raw_app_meta_data, new.raw_user_meta_data)
    );
  END IF;
  RETURN new;
END;
$fn$;

-- Privileges: triggers/helpers only — no client role may call them (a trigger function runs
-- regardless of EXECUTE). service_role keeps EXECUTE for admin tooling.
REVOKE ALL ON FUNCTION public.heistmind_verified_discord_id(UUID, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.heistmind_link_discord_id(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.heistmind_on_discord_identity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.heistmind_on_app_metadata() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.heistmind_verified_discord_id(UUID, JSONB, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.heistmind_link_discord_id(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.heistmind_on_discord_identity() TO service_role;
GRANT EXECUTE ON FUNCTION public.heistmind_on_app_metadata() TO service_role;

-- Triggers: created only if missing (00001's pattern) — the function bodies above are the logic.
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger
                 WHERE tgrelid = 'auth.identities'::regclass
                   AND tgname = 'heistmind_on_discord_identity_insert') THEN
    CREATE TRIGGER heistmind_on_discord_identity_insert
      AFTER INSERT ON auth.identities
      FOR EACH ROW EXECUTE FUNCTION public.heistmind_on_discord_identity();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger
                 WHERE tgrelid = 'auth.identities'::regclass
                   AND tgname = 'heistmind_on_discord_identity_delete') THEN
    CREATE TRIGGER heistmind_on_discord_identity_delete
      AFTER DELETE ON auth.identities
      FOR EACH ROW EXECUTE FUNCTION public.heistmind_on_discord_identity();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger
                 WHERE tgrelid = 'auth.users'::regclass
                   AND tgname = 'heistmind_on_app_metadata_update') THEN
    CREATE TRIGGER heistmind_on_app_metadata_update
      AFTER UPDATE OF raw_app_meta_data ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.heistmind_on_app_metadata();
  END IF;
END
$do$;

-- 6. Optional Auth hook (defense in depth, INERT until enabled on the project): GoTrue's
--    "Before User Created" hook runs for SELF-SERVICE signups (/signup, OAuth) but NOT for the
--    admin API (createUser/invite), so pointing it at this function blocks email/phone
--    self-signup while Discord sign-ups, admin-provisioned e2e personas and their password
--    logins keep working. (GoTrue has no "email signup only" switch: external_email_enabled=false
--    also disables password LOGIN, which the hosted deploy-gate's personas use.) Enable it with
--    hook_before_user_created_enabled = true +
--    hook_before_user_created_uri = 'pg-functions://postgres/public/heistmind_before_user_created'.
CREATE OR REPLACE FUNCTION public.heistmind_before_user_created(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF COALESCE(event -> 'user' -> 'app_metadata' ->> 'provider', '') IN ('email', 'phone') THEN
    RETURN jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'HeistMind accounts are created by signing in with Discord.'
    ));
  END IF;
  RETURN '{}'::jsonb;
END;
$fn$;

REVOKE ALL ON FUNCTION public.heistmind_before_user_created(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.heistmind_before_user_created(JSONB) TO service_role;
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT EXECUTE ON FUNCTION public.heistmind_before_user_created(JSONB) TO supabase_auth_admin;
  END IF;
END
$do$;

-- 7. Remediate existing squats, then restore verified links (row by row: each link sees the
--    previous one, so the UNIQUE never trips).
DO $do$
DECLARE
  r RECORD;
  released INTEGER;
  relinked INTEGER := 0;
BEGIN
  UPDATE public.profiles p
    SET discord_id = NULL, updated_at = TIMEZONE('utc', NOW())
    WHERE p.discord_id IS NOT NULL
      AND p.discord_id IS DISTINCT FROM (
        SELECT public.heistmind_verified_discord_id(u.id, u.raw_app_meta_data, u.raw_user_meta_data)
        FROM auth.users u
        WHERE u.id = p.id
      );
  GET DIAGNOSTICS released = ROW_COUNT;
  RAISE NOTICE 'Released % discord_id(s) not backed by a verified Discord identity', released;

  FOR r IN
    SELECT p.id,
           public.heistmind_verified_discord_id(u.id, u.raw_app_meta_data, u.raw_user_meta_data) AS snowflake
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.discord_id IS NULL
  LOOP
    CONTINUE WHEN r.snowflake IS NULL;
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.profiles WHERE discord_id = r.snowflake);
    UPDATE public.profiles
      SET discord_id = r.snowflake, updated_at = TIMEZONE('utc', NOW())
      WHERE id = r.id AND discord_id IS NULL;
    relinked := relinked + 1;
  END LOOP;
  RAISE NOTICE 'Linked % profile(s) to their verified Discord identity', relinked;
END
$do$;
