# Fix: Tasks RLS Policy Error

## 🚨 The Error

```
Failed to create task: new row violates row-level security policy for table "tasks"
```

This means the Row Level Security (RLS) policy on the `tasks` table is blocking task creation.

---

## ✅ Quick Fix (2 minutes)

### Step 1: Run the RLS Fix in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **SQL Editor**
4. Click **"New query"**
5. Copy and paste the **entire contents** of `supabase/fix-tasks-rls.sql`
6. Click **"Run"** (or press Cmd/Ctrl + Enter)

**Note:** You'll see a warning about "destructive operation" - this is safe! It's just dropping and recreating policies.

This will:
- Drop existing policies (to avoid conflicts)
- Recreate policies that allow users to create their own tasks
- Ensure RLS is enabled

### Step 2: Test

After running the SQL, try creating a task again. It should work!

---

## 🔍 What This Does

The fix ensures that:
- ✅ Users can **view** their own tasks
- ✅ Users can **insert** their own tasks (critical for creating tasks)
- ✅ Users can **update** their own tasks
- ✅ Users can **delete** their own tasks
- ✅ RLS is properly enabled

---

## 🔍 Alternative: Manual Policy Check

If you prefer to check/update policies manually:

1. Go to **Authentication** → **Policies** in Supabase
2. Find the `tasks` table
3. Check that there's an **INSERT** policy that allows:
   ```sql
   auth.uid() = user_id
   ```
4. If it doesn't exist or is wrong, create/update it

---

## ✅ That's It!

After running the migration, task creation should work!

**No redeployment needed** - RLS policies are database-level changes that take effect immediately.

---

## 📋 Complete RLS Setup Checklist

To ensure everything works, make sure you've run all three RLS fixes:

1. ✅ `fix-profiles-rls.sql` - For profile creation
2. ✅ `fix-workspaces-rls.sql` - For workspace creation
3. ✅ `fix-tasks-rls.sql` - For task creation (this one)

After all three are run, the full flow should work:
- User signs up → Profile created
- First task → Workspace created → Task created

