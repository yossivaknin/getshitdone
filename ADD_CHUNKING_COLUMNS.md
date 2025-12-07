# Add Chunking Columns to Tasks Table

This migration adds support for storing chunking preferences (chunk count and chunk duration) in the tasks table.

## Steps

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Run the following SQL:

```sql
-- Add chunking columns to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS chunk_count INTEGER,
ADD COLUMN IF NOT EXISTS chunk_duration INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN tasks.chunk_count IS 'Number of chunks to split the task into (for manual chunking)';
COMMENT ON COLUMN tasks.chunk_duration IS 'Duration per chunk in minutes (for manual chunking)';
```

4. Verify the columns were added by checking the table structure in the Table Editor.

## What This Does

- Adds `chunk_count` column to store the number of chunks a task should be split into
- Adds `chunk_duration` column to store the duration per chunk in minutes
- These values are used when scheduling tasks to create multiple calendar events

## Notes

- These columns are optional (nullable)
- If both `chunk_count` and `chunk_duration` are set, the task will be split into that many chunks of that duration
- The total duration is calculated as `chunk_count * chunk_duration`


