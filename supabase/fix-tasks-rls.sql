-- Fix RLS policies for tasks table
-- This allows users to create, read, update, and delete their own tasks

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own tasks." ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks." ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks." ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks." ON tasks;

-- Recreate policies with proper checks

-- Allow users to view their own tasks
CREATE POLICY "Users can view their own tasks."
  ON tasks FOR SELECT
  USING ( auth.uid() = user_id );

-- Allow users to insert their own tasks
-- This is critical for creating tasks
CREATE POLICY "Users can insert their own tasks."
  ON tasks FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

-- Allow users to update their own tasks
CREATE POLICY "Users can update their own tasks."
  ON tasks FOR UPDATE
  USING ( auth.uid() = user_id );

-- Allow users to delete their own tasks
CREATE POLICY "Users can delete their own tasks."
  ON tasks FOR DELETE
  USING ( auth.uid() = user_id );

-- Verify RLS is enabled
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;




