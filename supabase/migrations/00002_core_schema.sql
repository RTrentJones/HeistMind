-- HeistMind Core Schema Migration
-- Creates multi-tenant FitD game management system
-- Supports schema-based environment separation (development/production)

-- ===========================
-- 0. ENVIRONMENT SETUP
-- ===========================

-- Create schemas for environment separation
CREATE SCHEMA IF NOT EXISTS development;
CREATE SCHEMA IF NOT EXISTS production;

-- Set schema based on environment (default to development for safety)
-- This will be overridden by GitHub Actions for production deployments
DO $$
DECLARE
    target_schema TEXT := COALESCE(current_setting('heistmind.target_schema', true), 'development');
BEGIN
    -- Set search path to target schema, with public as fallback for auth
    EXECUTE format('SET search_path TO %I, public, extensions', target_schema);

    -- Log which schema we're deploying to
    RAISE NOTICE 'Deploying HeistMind tables to schema: %', target_schema;
END $$;

-- ===========================
-- 1. EXTEND PROFILES TABLE (PUBLIC SCHEMA)
-- ===========================

-- Profiles remain in public schema since they're shared across environments
-- Add preferences to existing profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- ===========================
-- 2. RULESETS TABLE
-- ===========================

CREATE TABLE rulesets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Ruleset identity
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',

  -- Complex FitD ruleset definition (stored in Supabase, not S3)
  content JSONB NOT NULL,
  schema_version TEXT NOT NULL DEFAULT '1.0',

  -- File metadata (for upload tracking)
  original_filename TEXT,
  file_size INTEGER,

  -- Status and visibility
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_public BOOLEAN DEFAULT false,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  compatibility_flags JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT rulesets_name_creator_unique UNIQUE (name, created_by)
);

-- ===========================
-- 3. GAMES TABLE
-- ===========================

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ruleset_id UUID REFERENCES rulesets(id) ON DELETE RESTRICT NOT NULL,

  -- Game configuration
  name TEXT NOT NULL,
  description TEXT,
  state TEXT DEFAULT 'draft' CHECK (state IN ('draft', 'recruiting', 'active', 'paused', 'completed')),

  -- Player/GM management
  max_players INTEGER DEFAULT 6 CHECK (max_players > 0 AND max_players <= 20),
  current_players INTEGER DEFAULT 0 CHECK (current_players >= 0),
  allow_co_gms BOOLEAN DEFAULT false,
  allow_spectators BOOLEAN DEFAULT false,

  -- Game-specific rule overrides
  rule_overrides JSONB DEFAULT '{}',
  house_rules TEXT,

  -- Invitation settings
  invite_only BOOLEAN DEFAULT true,
  public_listing BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT games_name_creator_unique UNIQUE (name, created_by),
  CONSTRAINT games_current_players_check CHECK (current_players <= max_players)
);

-- ===========================
-- 4. GAME PLAYERS TABLE
-- ===========================

CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Context-specific role in THIS game
  role TEXT DEFAULT 'player' CHECK (role IN ('game_master', 'player', 'co_gm', 'spectator')),
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'inactive', 'removed')),

  -- Permissions within this game
  permissions JSONB DEFAULT '{"can_create_characters": true, "can_edit_own_characters": true}',

  -- Timestamps
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(game_id, player_id)
);

-- ===========================
-- 5. CHARACTERS TABLE
-- ===========================

CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,

  -- Character identity
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,

  -- Character data (flexible for different FitD systems)
  character_data JSONB NOT NULL,
  playbook_type TEXT NOT NULL,

  -- Progression tracking
  experience_points INTEGER DEFAULT 0 CHECK (experience_points >= 0),
  advancement_history JSONB DEFAULT '[]',

  -- Character status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'retired', 'dead')),
  is_template BOOLEAN DEFAULT false,

  -- Portability support
  original_ruleset_id UUID REFERENCES rulesets(id),
  adaptations JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(game_id, created_by, name) -- Character names unique within game per player
);

-- ===========================
-- 6. INVITATIONS TABLE
-- ===========================

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Invitation targeting (either specific player OR public code)
  invited_player UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE,

  -- Invitation settings
  expires_at TIMESTAMPTZ,
  max_uses INTEGER DEFAULT 1 CHECK (max_uses > 0),
  used_count INTEGER DEFAULT 0 CHECK (used_count >= 0),

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT invitations_target_check CHECK (
    (invited_player IS NOT NULL AND invite_code IS NULL) OR
    (invited_player IS NULL AND invite_code IS NOT NULL)
  ),
  CONSTRAINT invitations_uses_check CHECK (used_count <= max_uses)
);

-- ===========================
-- 7. HELPER FUNCTIONS
-- ===========================

-- Function to check if user is game master of specific game
CREATE OR REPLACE FUNCTION is_game_master(user_id UUID, game_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM game_players
    WHERE player_id = user_id
    AND game_players.game_id = is_game_master.game_id
    AND (role = 'game_master' OR role = 'co_gm')
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in specific game
CREATE OR REPLACE FUNCTION get_user_game_role(user_id UUID, game_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM game_players
  WHERE player_id = user_id
  AND game_players.game_id = get_user_game_role.game_id
  AND status = 'active';

  RETURN COALESCE(user_role, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update current player count
CREATE OR REPLACE FUNCTION update_game_player_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update current_players count for the affected game
  UPDATE games
  SET current_players = (
    SELECT COUNT(*)
    FROM game_players
    WHERE game_id = COALESCE(NEW.game_id, OLD.game_id)
    AND status = 'active'
    AND role IN ('game_master', 'player', 'co_gm')
  )
  WHERE id = COALESCE(NEW.game_id, OLD.game_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ===========================
-- 8. TRIGGERS
-- ===========================

-- Trigger to automatically add game creator as game master
CREATE OR REPLACE FUNCTION auto_assign_game_master()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the game creator as game master
  INSERT INTO game_players (game_id, player_id, role, status, joined_at)
  VALUES (NEW.id, NEW.created_by, 'game_master', 'active', NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assign_gm_on_game_creation
  AFTER INSERT ON games
  FOR EACH ROW EXECUTE FUNCTION auto_assign_game_master();

-- Trigger to update game player count
CREATE TRIGGER update_game_player_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON game_players
  FOR EACH ROW EXECUTE FUNCTION update_game_player_count();

-- Trigger to update updated_at columns (function exists in public schema)
CREATE TRIGGER update_rulesets_updated_at
  BEFORE UPDATE ON rulesets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================
-- 9. ROW LEVEL SECURITY
-- ===========================

-- Enable RLS on all tables
ALTER TABLE rulesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ===========================
-- RULESETS POLICIES
-- ===========================

-- Users can view their own rulesets and public ones
CREATE POLICY "rulesets_select_policy" ON rulesets
  FOR SELECT USING (
    created_by = auth.uid() OR is_public = true
  );

-- Users can insert their own rulesets
CREATE POLICY "rulesets_insert_policy" ON rulesets
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Users can update their own rulesets
CREATE POLICY "rulesets_update_policy" ON rulesets
  FOR UPDATE USING (created_by = auth.uid());

-- Users can delete their own rulesets
CREATE POLICY "rulesets_delete_policy" ON rulesets
  FOR DELETE USING (created_by = auth.uid());

-- ===========================
-- GAMES POLICIES
-- ===========================

-- Users can see games they're part of or that are publicly listed
CREATE POLICY "games_select_policy" ON games
  FOR SELECT USING (
    public_listing = true OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM game_players
      WHERE game_id = games.id
      AND player_id = auth.uid()
      AND status = 'active'
    )
  );

-- Users can create games
CREATE POLICY "games_insert_policy" ON games
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Only game creators can modify games
CREATE POLICY "games_update_policy" ON games
  FOR UPDATE USING (created_by = auth.uid());

-- Only game creators can delete games
CREATE POLICY "games_delete_policy" ON games
  FOR DELETE USING (created_by = auth.uid());

-- ===========================
-- GAME PLAYERS POLICIES
-- ===========================

-- Users can see game_players for games they're part of
CREATE POLICY "game_players_select_policy" ON game_players
  FOR SELECT USING (
    player_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM game_players gp
      WHERE gp.game_id = game_players.game_id
      AND gp.player_id = auth.uid()
      AND gp.status = 'active'
    )
  );

-- Game masters can insert new players
CREATE POLICY "game_players_insert_policy" ON game_players
  FOR INSERT WITH CHECK (
    is_game_master(auth.uid(), game_id) OR
    player_id = auth.uid() -- Players can join themselves via invitations
  );

-- Game masters and players can update their own records
CREATE POLICY "game_players_update_policy" ON game_players
  FOR UPDATE USING (
    is_game_master(auth.uid(), game_id) OR
    player_id = auth.uid()
  );

-- Game masters can remove players
CREATE POLICY "game_players_delete_policy" ON game_players
  FOR DELETE USING (
    is_game_master(auth.uid(), game_id) OR
    player_id = auth.uid()
  );

-- ===========================
-- CHARACTERS POLICIES
-- ===========================

-- Users can see characters in games they're part of
CREATE POLICY "characters_select_policy" ON characters
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM game_players gp
      WHERE gp.game_id = characters.game_id
      AND gp.player_id = auth.uid()
      AND gp.status = 'active'
    )
  );

-- Players can create characters in games they're part of
CREATE POLICY "characters_insert_policy" ON characters
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM game_players gp
      WHERE gp.game_id = characters.game_id
      AND gp.player_id = auth.uid()
      AND gp.status = 'active'
    )
  );

-- Players can modify their own characters, GMs can modify any in their games
CREATE POLICY "characters_update_policy" ON characters
  FOR UPDATE USING (
    created_by = auth.uid() OR
    is_game_master(auth.uid(), game_id)
  );

-- Players can delete their own characters, GMs can delete any in their games
CREATE POLICY "characters_delete_policy" ON characters
  FOR DELETE USING (
    created_by = auth.uid() OR
    is_game_master(auth.uid(), game_id)
  );

-- ===========================
-- INVITATIONS POLICIES
-- ===========================

-- Users can see invitations for them or ones they created
CREATE POLICY "invitations_select_policy" ON invitations
  FOR SELECT USING (
    invited_player = auth.uid() OR
    invited_by = auth.uid() OR
    is_game_master(auth.uid(), game_id)
  );

-- Game masters can create invitations
CREATE POLICY "invitations_insert_policy" ON invitations
  FOR INSERT WITH CHECK (
    invited_by = auth.uid() AND
    is_game_master(auth.uid(), game_id)
  );

-- Game masters and invited players can update invitations
CREATE POLICY "invitations_update_policy" ON invitations
  FOR UPDATE USING (
    invited_by = auth.uid() OR
    invited_player = auth.uid() OR
    is_game_master(auth.uid(), game_id)
  );

-- Game masters can delete invitations
CREATE POLICY "invitations_delete_policy" ON invitations
  FOR DELETE USING (
    invited_by = auth.uid() OR
    is_game_master(auth.uid(), game_id)
  );

-- ===========================
-- 10. PERFORMANCE INDEXES
-- ===========================

-- Rulesets indexes
CREATE INDEX idx_rulesets_created_by ON rulesets(created_by);
CREATE INDEX idx_rulesets_status_public ON rulesets(status, is_public);
CREATE INDEX idx_rulesets_content_gin ON rulesets USING gin(content);
CREATE INDEX idx_rulesets_tags_gin ON rulesets USING gin(tags);

-- Games indexes
CREATE INDEX idx_games_created_by ON games(created_by);
CREATE INDEX idx_games_ruleset_id ON games(ruleset_id);
CREATE INDEX idx_games_state ON games(state);
CREATE INDEX idx_games_public_listing ON games(public_listing) WHERE public_listing = true;

-- Game players indexes
CREATE INDEX idx_game_players_game_id ON game_players(game_id);
CREATE INDEX idx_game_players_player_id ON game_players(player_id);
CREATE INDEX idx_game_players_status ON game_players(status);
CREATE INDEX idx_game_players_role ON game_players(role);

-- Characters indexes
CREATE INDEX idx_characters_created_by ON characters(created_by);
CREATE INDEX idx_characters_game_id ON characters(game_id);
CREATE INDEX idx_characters_status ON characters(status);
CREATE INDEX idx_characters_data_gin ON characters USING gin(character_data);

-- Invitations indexes
CREATE INDEX idx_invitations_game_id ON invitations(game_id);
CREATE INDEX idx_invitations_invited_player ON invitations(invited_player);
CREATE INDEX idx_invitations_invited_by ON invitations(invited_by);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at) WHERE expires_at IS NOT NULL;

-- ===========================
-- COMMENTS FOR DOCUMENTATION
-- ===========================

COMMENT ON TABLE rulesets IS 'Game Master uploaded FitD rulesets with complex JSON content (schema-aware)';
COMMENT ON TABLE games IS 'Game instances with specific rulesets and player management (schema-aware)';
COMMENT ON TABLE game_players IS 'Many-to-many relationship with context-specific roles (schema-aware)';
COMMENT ON TABLE characters IS 'Player characters within specific game contexts (schema-aware)';
COMMENT ON TABLE invitations IS 'Game invitation management with codes and targeting (schema-aware)';

COMMENT ON FUNCTION is_game_master(UUID, UUID) IS 'Check if user is game master of specific game (schema-aware)';
COMMENT ON FUNCTION get_user_game_role(UUID, UUID) IS 'Get user role in specific game context (schema-aware)';
