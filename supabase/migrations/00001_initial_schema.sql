-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (idempotent - handles existing Supabase profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add columns that might not exist in default Supabase profiles table
DO $$
BEGIN
    -- Add username column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'profiles'
                   AND column_name = 'username') THEN
        ALTER TABLE public.profiles ADD COLUMN username TEXT;
    END IF;

    -- Add discord_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'profiles'
                   AND column_name = 'discord_id') THEN
        ALTER TABLE public.profiles ADD COLUMN discord_id TEXT;
    END IF;

    -- Add avatar_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'profiles'
                   AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'profiles'
                   AND column_name = 'created_at') THEN
        ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'profiles'
                   AND column_name = 'updated_at') THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());
    END IF;
END $$;

-- Add unique constraints if they don't exist
DO $$
BEGIN
    -- Username unique constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_schema = 'public'
                   AND table_name = 'profiles'
                   AND constraint_name = 'profiles_username_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
    END IF;

    -- Discord ID unique constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_schema = 'public'
                   AND table_name = 'profiles'
                   AND constraint_name = 'profiles_discord_id_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_discord_id_key UNIQUE (discord_id);
    END IF;
END $$;

-- Enable Row Level Security (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profiles policies (idempotent)
DO $$
BEGIN
    -- Create select policy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies
                   WHERE schemaname = 'public'
                   AND tablename = 'profiles'
                   AND policyname = 'Public profiles are viewable by everyone') THEN
        CREATE POLICY "Public profiles are viewable by everyone"
          ON public.profiles FOR SELECT
          USING (true);
    END IF;

    -- Create update policy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies
                   WHERE schemaname = 'public'
                   AND tablename = 'profiles'
                   AND policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile"
          ON public.profiles FOR UPDATE
          USING (auth.uid() = id);
    END IF;
END $$;

-- Create trigger for new users (idempotent)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, profiles.username),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = TIMEZONE('utc', NOW());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger
                   WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- Create updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create updated_at trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger
                   WHERE tgname = 'update_profiles_updated_at') THEN
        CREATE TRIGGER update_profiles_updated_at
          BEFORE UPDATE ON public.profiles
          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
