-- Creates a stored procedure to safely insert or update Google OAuth tokens
-- This ensures the expires_at value is handled correctly as a BIGINT
CREATE OR REPLACE FUNCTION upsert_google_token(
  p_user_id UUID,
  p_access_token TEXT,
  p_refresh_token TEXT,
  p_expires_at BIGINT,
  p_token_type TEXT DEFAULT 'Bearer'
) RETURNS VOID AS $$
BEGIN
  -- Check if a record exists for this user
  IF EXISTS (SELECT 1 FROM google_tokens WHERE user_id = p_user_id) THEN
    -- Update existing record
    UPDATE google_tokens
    SET 
      access_token = p_access_token,
      refresh_token = p_refresh_token,
      expires_at = p_expires_at,
      token_type = p_token_type,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    -- Insert new record
    INSERT INTO google_tokens (
      user_id, 
      access_token, 
      refresh_token, 
      expires_at, 
      token_type, 
      created_at, 
      updated_at
    ) VALUES (
      p_user_id, 
      p_access_token, 
      p_refresh_token, 
      p_expires_at, 
      p_token_type,
      NOW(), 
      NOW()
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;