-- Add google_event_ids column to tasks table if it doesn't exist
-- This column stores an array of Google Calendar event IDs

-- Check if column exists, if not, add it
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
        
        -- Add comment for documentation
        COMMENT ON COLUMN tasks.google_event_ids IS 'Array of Google Calendar event IDs associated with this task';
    END IF;
END $$;




