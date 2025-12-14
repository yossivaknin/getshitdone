-- Add chunking columns to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS chunk_count INTEGER,
ADD COLUMN IF NOT EXISTS chunk_duration INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN tasks.chunk_count IS 'Number of chunks to split the task into (for manual chunking)';
COMMENT ON COLUMN tasks.chunk_duration IS 'Duration per chunk in minutes (for manual chunking)';




