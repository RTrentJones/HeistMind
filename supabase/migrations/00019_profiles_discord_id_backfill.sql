-- HeistMind — profiles.discord_id was NEVER populated (bot go-live finding F68). The column has
-- been UNIQUE since 00001, but no code path ever wrote it: the signup trigger only set
-- username/avatar, so the bot's resolveActor (profiles.findByDiscordId) found nobody — for
-- EVERY user. Backfill existing profiles from their Discord auth identity, and teach the
-- trigger to capture it for future signups.
--
-- PUBLIC-schema migration (profiles is shared across the env schemas) — idempotent, so the
-- per-env CI double-run is harmless.

DO $do$
DECLARE
  backfilled INTEGER;
BEGIN
  -- 1) Backfill: the Discord user id lives on the auth identity (provider_id; older rows carry
  --    it inside identity_data). Fills NULLs only — never overwrites an existing link.
  UPDATE public.profiles p
  SET discord_id = COALESCE(i.provider_id, i.identity_data->>'provider_id', i.identity_data->>'sub')
  FROM auth.identities i
  WHERE i.user_id = p.id
    AND i.provider = 'discord'
    AND p.discord_id IS NULL;
  GET DIAGNOSTICS backfilled = ROW_COUNT;
  RAISE NOTICE 'Backfilled discord_id on % profile(s)', backfilled;
END
$do$;

-- 2) Future signups: capture the Discord user id at profile creation. Discord OAuth puts the
--    provider id in raw_user_meta_data (provider_id, with sub as its alias); email-created test
--    users have neither and stay NULL (the UNIQUE constraint permits any number of NULLs).
--    Same body as 00001 plus discord_id; on conflict it fills only when currently NULL.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, discord_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', new.email),
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'provider_id', new.raw_user_meta_data->>'sub')
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, profiles.username),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    discord_id = COALESCE(profiles.discord_id, EXCLUDED.discord_id),
    updated_at = TIMEZONE('utc', NOW());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
