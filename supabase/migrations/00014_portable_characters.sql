-- HeistMind — portable characters (Phase 5, F56). Make characters user-owned + campaign-independent.
--
-- Today a character is born inside a game (`game_id NOT NULL ON DELETE CASCADE`) and can't exist
-- standalone or move. This makes `game_id` a NULLABLE "currently linked campaign" pointer
-- (NULL = standalone "My Characters"; <id> = linked into that campaign — single active campaign,
-- the chosen model), binds the ruleset on the character (the existing `original_ruleset_id`, backfilled
-- from the game), lets the owner INSERT a standalone character, and adds two SECURITY DEFINER RPCs
-- (attach/detach) that enforce ownership + active membership + ruleset-match server-side.
--
-- `game_id` going nullable changes the GENERATED row type, and the two new functions appear in it →
-- this needs a `pnpm db:types` regen before the repository adapter type-checks (the regen reads the
-- env schema AFTER this migration is applied, so it runs on the Stage-2 branch).
--
-- Single self-contained DO block (like 00005–00013); env schema from `heistmind.target_schema`.

DO $do$
DECLARE
  target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
  v_fk_name TEXT;
BEGIN
  EXECUTE format('SET search_path TO %I, public, extensions', target_schema);
  RAISE NOTICE 'Portable characters (Phase 5) in schema: %', target_schema;

  -- 1. game_id becomes a nullable "currently linked campaign" pointer (NULL = standalone).
  EXECUTE 'ALTER TABLE characters ALTER COLUMN game_id DROP NOT NULL';

  -- 2. Deleting a campaign returns its characters to STANDALONE (SET NULL), it no longer destroys them.
  --    Changing the ON DELETE action means dropping + re-adding the FK. Discover the existing FK on
  --    game_id by name-independent lookup (default name is characters_game_id_fkey, but don't assume).
  FOR v_fk_name IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = format('%I.characters', target_schema)::regclass
      AND con.contype = 'f'
      AND (SELECT attnum FROM pg_attribute
           WHERE attrelid = con.conrelid AND attname = 'game_id') = ANY (con.conkey)
  LOOP
    EXECUTE format('ALTER TABLE characters DROP CONSTRAINT %I', v_fk_name);
  END LOOP;
  EXECUTE 'ALTER TABLE characters ADD CONSTRAINT characters_game_id_fkey '
       || 'FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL';

  -- 3. Bind the ruleset on the character (it used to resolve via the game). Backfill from the game so
  --    every existing row knows its ruleset; new standalone characters set it at creation.
  EXECUTE 'UPDATE characters c SET original_ruleset_id = g.ruleset_id '
       || 'FROM games g WHERE c.game_id = g.id AND c.original_ruleset_id IS NULL';

  -- 4. Standalone names unique per owner. The per-game UNIQUE(game_id, created_by, name) still holds
  --    for linked characters; this only governs game_id IS NULL rows.
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_characters_standalone_name '
       || 'ON characters(created_by, name) WHERE game_id IS NULL';

  -- 5. INSERT policy: allow the owner to create a STANDALONE character (game_id NULL); an in-campaign
  --    insert still requires active membership. (SELECT already covers the owner; UPDATE/DELETE keep
  --    owner-or-GM. Re-homing a linked character goes through the attach RPC below, not a raw UPDATE.)
  EXECUTE format('DROP POLICY IF EXISTS %I ON characters', get_constraint_name('characters_insert_policy'));
  EXECUTE format(
    'CREATE POLICY %I ON characters FOR INSERT WITH CHECK ('
    || 'created_by = auth.uid() AND (game_id IS NULL OR is_active_game_member(auth.uid(), game_id)))',
    get_constraint_name('characters_insert_policy'));

  -- 6. Attach a standalone character to one of the caller's campaigns. SECURITY DEFINER so it runs as
  --    the table owner; it does its own checks: caller OWNS the character, is an ACTIVE member of the
  --    target game, and the game's ruleset MATCHES the character's. Single active campaign — attaching
  --    just sets game_id.
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
        RAISE EXCEPTION 'Character not found' USING ERRCODE = 'P0002';
      END IF;
      IF v_char.created_by <> v_user THEN
        RAISE EXCEPTION 'Not your character' USING ERRCODE = '42501';
      END IF;
      IF NOT is_active_game_member(v_user, p_game_id) THEN
        RAISE EXCEPTION 'Not an active member of that campaign' USING ERRCODE = '42501';
      END IF;

      SELECT ruleset_id INTO v_game_ruleset FROM games WHERE id = p_game_id;
      IF v_game_ruleset IS NULL THEN
        RAISE EXCEPTION 'Campaign not found' USING ERRCODE = 'P0002';
      END IF;
      IF v_char.original_ruleset_id IS DISTINCT FROM v_game_ruleset THEN
        RAISE EXCEPTION 'Character ruleset does not match the campaign' USING ERRCODE = 'P0001';
      END IF;

      UPDATE characters SET game_id = p_game_id, updated_at = NOW()
        WHERE id = p_character_id
        RETURNING * INTO v_char;
      RETURN v_char;
    END;
    $fnbody$ LANGUAGE plpgsql SECURITY DEFINER;
  $create$;

  -- Detach a character back to standalone. Owner-only (GM-initiated detach is deferred — Phase 5b).
  EXECUTE $create$
    CREATE OR REPLACE FUNCTION detach_character(p_character_id UUID)
    RETURNS characters AS $fnbody$
    DECLARE
      v_user UUID := auth.uid();
      v_char characters%ROWTYPE;
    BEGIN
      IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
      END IF;
      SELECT * INTO v_char FROM characters WHERE id = p_character_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Character not found' USING ERRCODE = 'P0002';
      END IF;
      IF v_char.created_by <> v_user THEN
        RAISE EXCEPTION 'Not your character' USING ERRCODE = '42501';
      END IF;
      UPDATE characters SET game_id = NULL, updated_at = NOW()
        WHERE id = p_character_id
        RETURNING * INTO v_char;
      RETURN v_char;
    END;
    $fnbody$ LANGUAGE plpgsql SECURITY DEFINER;
  $create$;

  -- Pin each function's search_path (so unqualified lookups resolve to the env schema) + expose to the
  -- API role (default privileges from 00003 don't cover functions created here later).
  EXECUTE format('ALTER FUNCTION attach_character_to_game(UUID, UUID) SET search_path = %I, public, extensions', target_schema);
  EXECUTE format('ALTER FUNCTION detach_character(UUID) SET search_path = %I, public, extensions', target_schema);
  EXECUTE 'GRANT EXECUTE ON FUNCTION attach_character_to_game(UUID, UUID) TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION detach_character(UUID) TO authenticated';
END
$do$;
