-- Create user_tags table to store tags per user (not per task)
-- This allows tags to sync across devices and browsers
-- Run this in your Supabase SQL Editor

-- Check if table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_tags'
  ) THEN
    -- Create user_tags table
    CREATE TABLE user_tags (
      id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
      created_at timestamptz DEFAULT now(),
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      name text NOT NULL,
      color text,
      UNIQUE(user_id, name) -- Prevent duplicate tag names per user
    );

    -- Enable RLS
    ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;

    -- Create SELECT policy - users can view their own tags
    CREATE POLICY "Users can view their own tags."
      ON user_tags FOR SELECT
      USING (auth.uid() = user_id);

    -- Create INSERT policy - users can create their own tags
    CREATE POLICY "Users can insert their own tags."
      ON user_tags FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    -- Create UPDATE policy - users can update their own tags
    CREATE POLICY "Users can update their own tags."
      ON user_tags FOR UPDATE
      USING (auth.uid() = user_id);

    -- Create DELETE policy - users can delete their own tags
    CREATE POLICY "Users can delete their own tags."
      ON user_tags FOR DELETE
      USING (auth.uid() = user_id);

    -- Create index for better query performance
    CREATE INDEX IF NOT EXISTS user_tags_user_id_idx ON user_tags(user_id);
    CREATE INDEX IF NOT EXISTS user_tags_name_idx ON user_tags(name);

    RAISE NOTICE 'user_tags table created successfully';
  ELSE
    RAISE NOTICE 'user_tags table already exists';
  END IF;
END $$;

-- Verify table exists
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_tags'
ORDER BY ordinal_position;

-- Verify policies exist
SELECT 
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'user_tags'
ORDER BY cmd;

