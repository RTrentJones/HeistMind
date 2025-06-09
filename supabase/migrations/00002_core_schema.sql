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
-- HELPER FUNCTION FOR CONSTRAINT NAMES
-- ===========================

CREATE OR REPLACE FUNCTION get_constraint_name(base_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN current_schema() || '_' || base_name;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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
  status TEXT DEFAULT 'draft',
  is_public BOOLEAN DEFAULT false,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  compatibility_flags JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints with schema-specific names
DO $$
BEGIN
    EXECUTE format('ALTER TABLE rulesets ADD CONSTRAINT %I CHECK (status IN (''draft'', ''published'', ''archived''))',
                   get_constraint_name('rulesets_status_check'));

    EXECUTE format('ALTER TABLE rulesets ADD CONSTRAINT %I UNIQUE (name, created_by)',
                   get_constraint_name('rulesets_name_creator_unique'));
END $$;

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
  state TEXT DEFAULT 'draft',

  -- Player/GM management
  max_players INTEGER DEFAULT 6,
  current_players INTEGER DEFAULT 0,
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints with schema-specific names
DO $$
BEGIN
    EXECUTE format('ALTER TABLE games ADD CONSTRAINT %I CHECK (state IN (''draft'', ''recruiting'', ''active'', ''paused'', ''completed''))',
                   get_constraint_name('games_state_check'));

    EXECUTE format('ALTER TABLE games ADD CONSTRAINT %I CHECK (max_players > 0 AND max_players <= 20)',
                   get_constraint_name('games_max_players_check'));

    EXECUTE format('ALTER TABLE games ADD CONSTRAINT %I CHECK (current_players >= 0)',
                   get_constraint_name('games_current_players_positive_check'));

    EXECUTE format('ALTER TABLE games ADD CONSTRAINT %I CHECK (current_players <= max_players)',
                   get_constraint_name('games_current_players_check'));

    EXECUTE format('ALTER TABLE games ADD CONSTRAINT %I UNIQUE (name, created_by)',
                   get_constraint_name('games_name_creator_unique'));
END $$;

-- ===========================
-- 4. GAME PLAYERS TABLE
-- ===========================

CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Context-specific role in THIS game
  role TEXT DEFAULT 'player',
  status TEXT DEFAULT 'invited',

  -- Permissions within this game
  permissions JSONB DEFAULT '{"can_create_characters": true, "can_edit_own_characters": true}',

  -- Timestamps
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ
);

-- Add constraints with schema-specific names
DO $$
BEGIN
    EXECUTE format('ALTER TABLE game_players ADD CONSTRAINT %I CHECK (role IN (''game_master'', ''player'', ''co_gm'', ''spectator''))',
                   get_constraint_name('game_players_role_check'));

    EXECUTE format('ALTER TABLE game_players ADD CONSTRAINT %I CHECK (status IN (''invited'', ''active'', ''inactive'', ''removed''))',
                   get_constraint_name('game_players_status_check'));

    EXECUTE format('ALTER TABLE game_players ADD CONSTRAINT %I UNIQUE (game_id, player_id)',
                   get_constraint_name('game_players_unique'));
END $$;

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
  experience_points INTEGER DEFAULT 0,
  advancement_history JSONB DEFAULT '[]',

  -- Character status
  status TEXT DEFAULT 'active',
  is_template BOOLEAN DEFAULT false,

  -- Portability support
  original_ruleset_id UUID REFERENCES rulesets(id),
  adaptations JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints with schema-specific names
DO $$
BEGIN
    EXECUTE format('ALTER TABLE characters ADD CONSTRAINT %I CHECK (experience_points >= 0)',
                   get_constraint_name('characters_xp_check'));

    EXECUTE format('ALTER TABLE characters ADD CONSTRAINT %I CHECK (status IN (''active'', ''inactive'', ''retired'', ''dead''))',
                   get_constraint_name('characters_status_check'));

    EXECUTE format('ALTER TABLE characters ADD CONSTRAINT %I UNIQUE (game_id, created_by, name)',
                   get_constraint_name('characters_name_unique'));
END $$;

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
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,

  -- Status tracking
  status TEXT DEFAULT 'pending',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- Add constraints with schema-specific names
DO $$
BEGIN
    EXECUTE format('ALTER TABLE invitations ADD CONSTRAINT %I CHECK (max_uses > 0)',
                   get_constraint_name('invitations_max_uses_check'));

    EXECUTE format('ALTER TABLE invitations ADD CONSTRAINT %I CHECK (used_count >= 0)',
                   get_constraint_name('invitations_used_count_check'));

    EXECUTE format('ALTER TABLE invitations ADD CONSTRAINT %I CHECK (status IN (''pending'', ''accepted'', ''declined'', ''expired'', ''revoked''))',
                   get_constraint_name('invitations_status_check'));

    EXECUTE format('ALTER TABLE invitations ADD CONSTRAINT %I CHECK ((invited_player IS NOT NULL AND invite_code IS NULL) OR (invited_player IS NULL AND invite_code IS NOT NULL))',
                   get_constraint_name('invitations_target_check'));

    EXECUTE format('ALTER TABLE invitations ADD CONSTRAINT %I CHECK (used_count <= max_uses)',
                   get_constraint_name('invitations_uses_check'));
END $$;

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

-- Create triggers with schema-specific names
DO $$
BEGIN
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT ON games FOR EACH ROW EXECUTE FUNCTION auto_assign_game_master()',
                   get_constraint_name('assign_gm_on_game_creation'));

    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON game_players FOR EACH ROW EXECUTE FUNCTION update_game_player_count()',
                   get_constraint_name('update_game_player_count_trigger'));

    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON rulesets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
                   get_constraint_name('update_rulesets_updated_at'));

    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
                   get_constraint_name('update_games_updated_at'));

    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON characters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
                   get_constraint_name('update_characters_updated_at'));
END $$;

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

-- Create policies with schema-specific names
DO $$
BEGIN
    EXECUTE format('CREATE POLICY %I ON rulesets FOR SELECT USING (created_by = auth.uid() OR is_public = true)',
                   get_constraint_name('rulesets_select_policy'));

    EXECUTE format('CREATE POLICY %I ON rulesets FOR INSERT WITH CHECK (created_by = auth.uid())',
                   get_constraint_name('rulesets_insert_policy'));

    EXECUTE format('CREATE POLICY %I ON rulesets FOR UPDATE USING (created_by = auth.uid())',
                   get_constraint_name('rulesets_update_policy'));

    EXECUTE format('CREATE POLICY %I ON rulesets FOR DELETE USING (created_by = auth.uid())',
                   get_constraint_name('rulesets_delete_policy'));
END $$;

-- ===========================
-- GAMES POLICIES
-- ===========================

DO $$
BEGIN
    EXECUTE format('CREATE POLICY %I ON games FOR SELECT USING (public_listing = true OR created_by = auth.uid() OR EXISTS (SELECT 1 FROM game_players WHERE game_id = games.id AND player_id = auth.uid() AND status = ''active''))',
                   get_constraint_name('games_select_policy'));

    EXECUTE format('CREATE POLICY %I ON games FOR INSERT WITH CHECK (created_by = auth.uid())',
                   get_constraint_name('games_insert_policy'));

    EXECUTE format('CREATE POLICY %I ON games FOR UPDATE USING (created_by = auth.uid())',
                   get_constraint_name('games_update_policy'));

    EXECUTE format('CREATE POLICY %I ON games FOR DELETE USING (created_by = auth.uid())',
                   get_constraint_name('games_delete_policy'));
END $$;

-- ===========================
-- GAME PLAYERS POLICIES
-- ===========================

DO $$
BEGIN
    EXECUTE format('CREATE POLICY %I ON game_players FOR SELECT USING (player_id = auth.uid() OR EXISTS (SELECT 1 FROM game_players gp WHERE gp.game_id = game_players.game_id AND gp.player_id = auth.uid() AND gp.status = ''active''))',
                   get_constraint_name('game_players_select_policy'));

    EXECUTE format('CREATE POLICY %I ON game_players FOR INSERT WITH CHECK (is_game_master(auth.uid(), game_id) OR player_id = auth.uid())',
                   get_constraint_name('game_players_insert_policy'));

    EXECUTE format('CREATE POLICY %I ON game_players FOR UPDATE USING (is_game_master(auth.uid(), game_id) OR player_id = auth.uid())',
                   get_constraint_name('game_players_update_policy'));

    EXECUTE format('CREATE POLICY %I ON game_players FOR DELETE USING (is_game_master(auth.uid(), game_id) OR player_id = auth.uid())',
                   get_constraint_name('game_players_delete_policy'));
END $$;

-- ===========================
-- CHARACTERS POLICIES
-- ===========================

DO $$
BEGIN
    EXECUTE format('CREATE POLICY %I ON characters FOR SELECT USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM game_players gp WHERE gp.game_id = characters.game_id AND gp.player_id = auth.uid() AND gp.status = ''active''))',
                   get_constraint_name('characters_select_policy'));

    EXECUTE format('CREATE POLICY %I ON characters FOR INSERT WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM game_players gp WHERE gp.game_id = characters.game_id AND gp.player_id = auth.uid() AND gp.status = ''active''))',
                   get_constraint_name('characters_insert_policy'));

    EXECUTE format('CREATE POLICY %I ON characters FOR UPDATE USING (created_by = auth.uid() OR is_game_master(auth.uid(), game_id))',
                   get_constraint_name('characters_update_policy'));

    EXECUTE format('CREATE POLICY %I ON characters FOR DELETE USING (created_by = auth.uid() OR is_game_master(auth.uid(), game_id))',
                   get_constraint_name('characters_delete_policy'));
END $$;

-- ===========================
-- INVITATIONS POLICIES
-- ===========================

DO $$
BEGIN
    EXECUTE format('CREATE POLICY %I ON invitations FOR SELECT USING (invited_player = auth.uid() OR invited_by = auth.uid() OR is_game_master(auth.uid(), game_id))',
                   get_constraint_name('invitations_select_policy'));

    EXECUTE format('CREATE POLICY %I ON invitations FOR INSERT WITH CHECK (invited_by = auth.uid() AND is_game_master(auth.uid(), game_id))',
                   get_constraint_name('invitations_insert_policy'));

    EXECUTE format('CREATE POLICY %I ON invitations FOR UPDATE USING (invited_by = auth.uid() OR invited_player = auth.uid() OR is_game_master(auth.uid(), game_id))',
                   get_constraint_name('invitations_update_policy'));

    EXECUTE format('CREATE POLICY %I ON invitations FOR DELETE USING (invited_by = auth.uid() OR is_game_master(auth.uid(), game_id))',
                   get_constraint_name('invitations_delete_policy'));
END $$;

-- ===========================
-- 10. PERFORMANCE INDEXES
-- ===========================

-- All indexes are automatically schema-specific since they're created on tables within the schema

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

-- Clean up the helper function
DROP FUNCTION IF EXISTS get_constraint_name(TEXT);