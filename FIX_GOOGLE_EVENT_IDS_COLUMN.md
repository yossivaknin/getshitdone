# Fix: Add google_event_ids Column to Tasks Table

## 🚨 The Error

```
Failed to create task: Could not find the 'google_event_ids' column of 'tasks' in the schema cache
```

This means the `google_event_ids` column doesn't exist in your Supabase database.

---

## ✅ Quick Fix (2 minutes)

### Step 1: Add the Column in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **SQL Editor**
4. Click **"New query"**
5. Copy and paste this SQL:

```sql
-- Add google_event_ids column to tasks table if it doesn't exist
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS google_event_ids jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN tasks.google_event_ids IS 'Array of Google Calendar event IDs associated with this task';
```

6. Click **"Run"** (or press Cmd/Ctrl + Enter)

### Step 2: Verify

1. Go to **Table Editor** → **tasks**
2. Check that `google_event_ids` column exists
3. It should be type `jsonb` with default value `[]`

---

## ✅ That's It!

After running the SQL, try creating a task again. It should work!

---

## 🔍 Alternative: Use the Migration File

You can also use the migration file I created:

1. Open `supabase/add-google-event-ids-column.sql`
2. Copy the contents
3. Paste into Supabase SQL Editor
4. Run it

This will safely add the column only if it doesn't already exist.


