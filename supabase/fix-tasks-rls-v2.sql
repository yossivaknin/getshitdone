-- Fix RLS policies for tasks table (Version 2 - More explicit)
-- This allows users to create, read, update, and delete their own tasks

-- First, ensure RLS is enabled
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on tasks (to start fresh)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tasks') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON tasks';
    END LOOP;
END $$;

-- Recreate policies with proper checks

-- Allow users to view their own tasks
CREATE POLICY "Users can view their own tasks."
  ON tasks FOR SELECT
  USING ( auth.uid() = user_id );

-- Allow users to insert their own tasks
-- This is critical for creating tasks
-- WITH CHECK ensures the user_id matches the authenticated user
CREATE POLICY "Users can insert their own tasks."
  ON tasks FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

-- Allow users to update their own tasks
CREATE POLICY "Users can update their own tasks."
  ON tasks FOR UPDATE
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );

-- Allow users to delete their own tasks
CREATE POLICY "Users can delete their own tasks."
  ON tasks FOR DELETE
  USING ( auth.uid() = user_id );

-- Verify policies were created
SELECT 
    policyname,
    cmd as operation,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies 
WHERE tablename = 'tasks'
ORDER BY policyname;

