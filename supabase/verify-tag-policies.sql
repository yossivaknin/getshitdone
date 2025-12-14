-- Verify and create RLS policies for tags table
-- Run this in your Supabase SQL editor if tags aren't being saved

-- Check existing policies
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
WHERE tablename = 'tags';

-- Create INSERT policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tags' 
    AND policyname = 'Users can insert tags on their tasks.'
  ) THEN
    CREATE POLICY "Users can insert tags on their tasks."
      ON tags FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM tasks
          WHERE tasks.id = tags.task_id
          AND tasks.user_id = auth.uid()
        )
      );
    RAISE NOTICE 'INSERT policy created';
  ELSE
    RAISE NOTICE 'INSERT policy already exists';
  END IF;
END $$;

-- Create UPDATE policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tags' 
    AND policyname = 'Users can update tags on their tasks.'
  ) THEN
    CREATE POLICY "Users can update tags on their tasks."
      ON tags FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM tasks
          WHERE tasks.id = tags.task_id
          AND tasks.user_id = auth.uid()
        )
      );
    RAISE NOTICE 'UPDATE policy created';
  ELSE
    RAISE NOTICE 'UPDATE policy already exists';
  END IF;
END $$;

-- Create DELETE policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tags' 
    AND policyname = 'Users can delete tags on their tasks.'
  ) THEN
    CREATE POLICY "Users can delete tags on their tasks."
      ON tags FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM tasks
          WHERE tasks.id = tags.task_id
          AND tasks.user_id = auth.uid()
        )
      );
    RAISE NOTICE 'DELETE policy created';
  ELSE
    RAISE NOTICE 'DELETE policy already exists';
  END IF;
END $$;

-- Verify all policies are in place
SELECT 
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'tags'
ORDER BY cmd;

