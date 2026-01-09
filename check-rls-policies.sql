-- Check if RLS policies exist for user_tokens table
-- Run this in Supabase SQL Editor

-- 1. Check if table exists and RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'user_tokens';

-- 2. Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_tokens';

-- 3. If policies don't exist, create them:
-- (Copy and run these if needed)

-- Enable RLS
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tokens
CREATE POLICY IF NOT EXISTS "Users can view own tokens" 
ON user_tokens
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own tokens
CREATE POLICY IF NOT EXISTS "Users can insert own tokens" 
ON user_tokens
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tokens
CREATE POLICY IF NOT EXISTS "Users can update own tokens" 
ON user_tokens
FOR UPDATE 
USING (auth.uid() = user_id);
