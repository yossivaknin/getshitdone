-- Fix RLS policies for workspaces table
-- This allows users to create their own workspace

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view workspaces they own." ON workspaces;
DROP POLICY IF EXISTS "Users can insert workspaces." ON workspaces;
DROP POLICY IF EXISTS "Users can update their own workspaces." ON workspaces;
DROP POLICY IF EXISTS "Users can delete their own workspaces." ON workspaces;

-- Recreate policies with proper checks

-- Allow users to view workspaces they own
CREATE POLICY "Users can view workspaces they own."
  ON workspaces FOR SELECT
  USING ( auth.uid() = owner_id );

-- Allow users to insert their own workspaces
-- This is critical for creating workspaces on first task creation
CREATE POLICY "Users can insert workspaces."
  ON workspaces FOR INSERT
  WITH CHECK ( auth.uid() = owner_id );

-- Allow users to update their own workspaces
CREATE POLICY "Users can update their own workspaces."
  ON workspaces FOR UPDATE
  USING ( auth.uid() = owner_id );

-- Allow users to delete their own workspaces
CREATE POLICY "Users can delete their own workspaces."
  ON workspaces FOR DELETE
  USING ( auth.uid() = owner_id );

-- Verify RLS is enabled
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;


