-- Ensure google_tokens table exists with all required columns
CREATE TABLE IF NOT EXISTS google_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add token_type column if it doesn't exist
ALTER TABLE IF EXISTS google_tokens 
ADD COLUMN IF NOT EXISTS token_type TEXT DEFAULT 'Bearer';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_google_tokens_user_id ON google_tokens(user_id);

-- Set up Row Level Security
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can only see their own tokens" ON google_tokens;
DROP POLICY IF EXISTS "Service role can manage all tokens" ON google_tokens;
DROP POLICY IF EXISTS "Users can insert their own tokens" ON google_tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON google_tokens;

-- Create RLS policies
-- Policy for users to select their own tokens
CREATE POLICY "Users can only see their own tokens" 
ON google_tokens FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for users to insert their own tokens
CREATE POLICY "Users can insert their own tokens" 
ON google_tokens FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own tokens
CREATE POLICY "Users can update their own tokens" 
ON google_tokens FOR UPDATE
USING (auth.uid() = user_id);

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON google_tokens TO authenticated;

-- Grant all permissions to service_role
GRANT ALL ON google_tokens TO service_role;