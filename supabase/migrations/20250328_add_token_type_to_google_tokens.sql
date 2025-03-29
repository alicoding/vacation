-- Add token_type to google_tokens table
ALTER TABLE IF EXISTS google_tokens 
ADD COLUMN IF NOT EXISTS token_type TEXT;

-- Update any existing rows to have a default token_type value if needed
UPDATE google_tokens 
SET token_type = 'Bearer' 
WHERE token_type IS NULL;