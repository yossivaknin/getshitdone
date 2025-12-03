-- Fix tasks table: Add all missing columns
-- Run this in Supabase SQL Editor if you're getting column errors

-- Add position column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'position'
    ) THEN
        ALTER TABLE tasks 
        ADD COLUMN position integer DEFAULT 0;
        
        COMMENT ON COLUMN tasks.position IS 'Position/order of task within its status column';
    END IF;
END $$;

-- Add google_event_ids column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'google_event_ids'
    ) THEN
        ALTER TABLE tasks 
        ADD COLUMN google_event_ids jsonb DEFAULT '[]'::jsonb;
        
        COMMENT ON COLUMN tasks.google_event_ids IS 'Array of Google Calendar event IDs associated with this task';
    END IF;
END $$;

-- Add status column if it doesn't exist (should exist, but just in case)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE tasks 
        ADD COLUMN status text DEFAULT 'todo';
        
        COMMENT ON COLUMN tasks.status IS 'Task status: todo, in_progress, or done';
    END IF;
END $$;

-- Ensure user_id is NOT NULL (critical for user separation)
DO $$ 
BEGIN
    -- First, if user_id doesn't exist, add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE tasks 
        ADD COLUMN user_id uuid REFERENCES auth.users(id);
    END IF;
    
    -- Then, if there are any NULL user_ids, we can't make it NOT NULL
    -- So we'll just ensure the column exists and has a default
    -- Note: You may need to manually set user_id for existing tasks
END $$;

-- Verify all columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

