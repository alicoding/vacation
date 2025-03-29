-- This file is meant to be run directly in the Supabase SQL Editor
-- It will fix the google_tokens table structure and permissions

-- First, ensure google_tokens table has all required columns
DO $$
BEGIN
    -- Check if user_id column exists, add if it doesn't
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'google_tokens' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE google_tokens ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Check if access_token column exists, add if it doesn't
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'google_tokens' AND column_name = 'access_token'
    ) THEN
        ALTER TABLE google_tokens ADD COLUMN access_token TEXT NOT NULL DEFAULT '';
    END IF;

    -- Check if refresh_token column exists, add if it doesn't
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'google_tokens' AND column_name = 'refresh_token'
    ) THEN
        ALTER TABLE google_tokens ADD COLUMN refresh_token TEXT NOT NULL DEFAULT '';
    END IF;

    -- Check if expires_at column exists, add if it doesn't
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'google_tokens' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE google_tokens ADD COLUMN expires_at BIGINT NOT NULL DEFAULT 0;
    END IF;

    -- Check if token_type column exists, add if it doesn't
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'google_tokens' AND column_name = 'token_type'
    ) THEN
        ALTER TABLE google_tokens ADD COLUMN token_type TEXT DEFAULT 'Bearer';
    END IF;

    -- Check if created_at column exists, add if it doesn't
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'google_tokens' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE google_tokens ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;

    -- Check if updated_at column exists, add if it doesn't
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'google_tokens' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE google_tokens ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END
$$;

-- Create index for performance if it doesn't exist yet
CREATE INDEX IF NOT EXISTS idx_google_tokens_user_id ON google_tokens(user_id);

-- Enable Row Level Security
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read their own tokens" ON google_tokens;
DROP POLICY IF EXISTS "Users can insert their own tokens" ON google_tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON google_tokens;

-- Create RLS policies
CREATE POLICY "Users can read their own tokens" 
ON google_tokens FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens" 
ON google_tokens FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens" 
ON google_tokens FOR UPDATE
USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON google_tokens TO authenticated;
GRANT ALL ON google_tokens TO service_role;