-- Add missing columns to google_tokens table if they don't exist
ALTER TABLE IF EXISTS google_tokens 
ADD COLUMN IF NOT EXISTS refresh_token TEXT,
ADD COLUMN IF NOT EXISTS expires_at BIGINT;

-- Set up Row Level Security (if not already enabled)
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (idempotent)
DO $$
BEGIN
    -- Policies for users to manage only their own tokens
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'google_tokens' AND policyname = 'Users can only see their own tokens') THEN
        CREATE POLICY "Users can only see their own tokens" 
        ON google_tokens FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'google_tokens' AND policyname = 'Users can insert their own tokens') THEN
        CREATE POLICY "Users can insert their own tokens" 
        ON google_tokens FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'google_tokens' AND policyname = 'Users can update their own tokens') THEN
        CREATE POLICY "Users can update their own tokens" 
        ON google_tokens FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Grant permissions (idempotent)
GRANT SELECT, INSERT, UPDATE ON google_tokens TO authenticated;
GRANT ALL ON google_tokens TO service_role;