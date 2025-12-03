# Fix: Add Missing Columns to Tasks Table

## 🚨 The Error

```
Failed to create task: Could not find the 'position' column of 'tasks' in the schema cache
```

Or similar errors for other columns. This means your `tasks` table is missing required columns.

---

## ✅ Quick Fix (3 minutes)

### Step 1: Run the Migration in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **SQL Editor**
4. Click **"New query"**
5. Copy and paste the **entire contents** of `supabase/fix-tasks-table-columns.sql`
6. Click **"Run"** (or press Cmd/Ctrl + Enter)

This will:
- Add `position` column (for task ordering)
- Add `google_event_ids` column (for Google Calendar integration)
- Add `status` column (if missing)
- Ensure `user_id` column exists

### Step 2: Verify Columns Exist

After running the migration, you should see a table showing all columns in the `tasks` table. Verify these columns exist:

- ✅ `id` (uuid, primary key)
- ✅ `created_at` (timestamptz)
- ✅ `title` (text)
- ✅ `description` (text)
- ✅ `status` (text, default 'todo')
- ✅ `list_id` (uuid, nullable)
- ✅ `due_date` (timestamptz, nullable)
- ✅ `duration_minutes` (integer, nullable)
- ✅ `google_event_ids` (jsonb, default '[]')
- ✅ `position` (integer, default 0)
- ✅ `user_id` (uuid, references auth.users)

### Step 3: Test

After running the migration, try creating a task again. It should work!

---

## 🔍 Alternative: Create Tasks Table from Scratch

If your `tasks` table is completely missing or corrupted, you can recreate it:

**⚠️ WARNING: This will DELETE all existing tasks!**

```sql
-- Drop existing table (WARNING: This deletes all data!)
DROP TABLE IF EXISTS tasks CASCADE;

-- Recreate tasks table with all columns
CREATE TABLE tasks (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  title text NOT NULL,
  description text,
  status text DEFAULT 'todo', -- 'todo', 'in_progress', 'done'
  list_id uuid REFERENCES lists(id) ON DELETE CASCADE,
  due_date timestamptz,
  duration_minutes integer,
  google_event_ids jsonb DEFAULT '[]'::jsonb,
  position integer DEFAULT 0,
  user_id uuid REFERENCES auth.users(id) NOT NULL
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view their own tasks."
  ON tasks FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert their own tasks."
  ON tasks FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update their own tasks."
  ON tasks FOR UPDATE
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can delete their own tasks."
  ON tasks FOR DELETE
  USING ( auth.uid() = user_id );

-- Add indexes
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_list_id_idx ON tasks(list_id);
```

**Only use this if you don't have any existing tasks you want to keep!**

---

## ✅ Recommended Approach

1. **First, try the migration** (`fix-tasks-table-columns.sql`) - it's safe and won't delete data
2. **If that doesn't work**, check what columns actually exist in your table
3. **If the table is completely wrong**, use the "Create from Scratch" approach above

---

## 🔍 Check Current Table Structure

To see what columns currently exist in your `tasks` table:

```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;
```

Run this in Supabase SQL Editor to see what you have.

