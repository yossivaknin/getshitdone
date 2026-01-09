-- Create user_tokens table to persist Google Calendar tokens

CREATE TABLE IF NOT EXISTS user_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
  google_access_token text,
  google_refresh_token text,
  token_expires_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Enable row level security and policies
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

-- Make migration idempotent: drop policies if they already exist
DROP POLICY IF EXISTS "Users can view their own tokens" ON user_tokens;
CREATE POLICY "Users can view their own tokens" ON user_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tokens" ON user_tokens;
CREATE POLICY "Users can insert their own tokens" ON user_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tokens" ON user_tokens;
CREATE POLICY "Users can update their own tokens" ON user_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: Restrict access to service role for administrative operations if needed
