-- Create tags table if it doesn't exist
-- Run this in your Supabase SQL Editor

-- Check if table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tags'
  ) THEN
    -- Create tags table
    CREATE TABLE tags (
      id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
      created_at timestamptz DEFAULT now(),
      name text NOT NULL,
      color text,
      task_id uuid REFERENCES tasks(id) ON DELETE CASCADE
    );

    -- Enable RLS
    ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

    -- Create SELECT policy
    CREATE POLICY "Users can view tags on their tasks."
      ON tags FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM tasks
          WHERE tasks.id = tags.task_id
          AND tasks.user_id = auth.uid()
        )
      );

    -- Create INSERT policy
    CREATE POLICY "Users can insert tags on their tasks."
      ON tags FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM tasks
          WHERE tasks.id = tags.task_id
          AND tasks.user_id = auth.uid()
        )
      );

    -- Create UPDATE policy
    CREATE POLICY "Users can update tags on their tasks."
      ON tags FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM tasks
          WHERE tasks.id = tags.task_id
          AND tasks.user_id = auth.uid()
        )
      );

    -- Create DELETE policy
    CREATE POLICY "Users can delete tags on their tasks."
      ON tags FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM tasks
          WHERE tasks.id = tags.task_id
          AND tasks.user_id = auth.uid()
        )
      );

    -- Create index for better query performance
    CREATE INDEX IF NOT EXISTS tags_task_id_idx ON tags(task_id);
    CREATE INDEX IF NOT EXISTS tags_name_idx ON tags(name);

    RAISE NOTICE 'Tags table created successfully';
  ELSE
    RAISE NOTICE 'Tags table already exists';
  END IF;
END $$;

-- Verify table exists
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'tags'
ORDER BY ordinal_position;

-- Verify policies exist
SELECT 
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'tags'
ORDER BY cmd;

