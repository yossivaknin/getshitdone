# Fix: Chunking Columns Schema Cache Error

## 🚨 The Error

```
Failed to create task: Could not find the 'chunk_count' column of 'tasks' in the schema cache
```

This means either:
1. The columns haven't been added to the database yet, OR
2. The columns were added but Supabase's schema cache hasn't refreshed yet

---

## ✅ Complete Fix (3 minutes)

### Step 1: Verify Columns Don't Exist

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Table Editor** → **tasks**
4. Check if `chunk_count` and `chunk_duration` columns exist

### Step 2: Add the Columns (if missing)

1. Go to **SQL Editor**
2. Click **"New query"**
3. Copy and paste this SQL:

```sql
-- Add chunking columns to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS chunk_count INTEGER,
ADD COLUMN IF NOT EXISTS chunk_duration INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN tasks.chunk_count IS 'Number of chunks to split the task into (for manual chunking)';
COMMENT ON COLUMN tasks.chunk_duration IS 'Duration per chunk in minutes (for manual chunking)';

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks' 
AND column_name IN ('chunk_count', 'chunk_duration');
```

4. Click **"Run"** (or press Cmd/Ctrl + Enter)
5. You should see a result showing both columns exist

### Step 3: Wait for Schema Cache to Refresh

Supabase's PostgREST API caches the schema. After adding columns, wait **1-2 minutes** for the cache to refresh.

**To force a cache refresh faster:**
1. Go to **Settings** → **API** in Supabase Dashboard
2. Look for "Restart API" or similar option (if available)
3. Or just wait 1-2 minutes

### Step 4: Verify Columns in Table Editor

1. Go to **Table Editor** → **tasks**
2. Confirm you see:
   - ✅ `chunk_count` (integer, nullable)
   - ✅ `chunk_duration` (integer, nullable)

### Step 5: Test Again

After waiting 1-2 minutes, try creating a task again. It should work!

---

## 🔍 Alternative: Make Code Defensive (Temporary Workaround)

If you need it to work immediately while waiting for cache refresh, we can make the code skip these fields if they don't exist. But the proper fix is to add the columns and wait for cache refresh.

---

## ✅ That's It!

After running the migration and waiting for the cache to refresh, task creation should work!

**Note:** The schema cache usually refreshes within 1-2 minutes. If it still doesn't work after 5 minutes, there might be a different issue.



