# Fix: Workspaces RLS Policy Error

## 🚨 The Error

```
Failed to create task: Failed to create workspace: new row violates row-level security policy for table "workspaces"
```

This means the Row Level Security (RLS) policy on the `workspaces` table is blocking workspace creation.

---

## ✅ Quick Fix (2 minutes)

### Step 1: Run the RLS Fix in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **SQL Editor**
4. Click **"New query"**
5. Copy and paste the **entire contents** of `supabase/fix-workspaces-rls.sql`
6. Click **"Run"** (or press Cmd/Ctrl + Enter)

**Note:** You'll see a warning about "destructive operation" - this is safe! It's just dropping and recreating policies.

This will:
- Drop existing policies (to avoid conflicts)
- Recreate policies that allow users to create their own workspace
- Ensure RLS is enabled

### Step 2: Test

After running the SQL, try creating a task again. It should work!

---

## 🔍 What This Does

The fix ensures that:
- ✅ Users can **view** workspaces they own
- ✅ Users can **insert** their own workspace (critical for first task creation)
- ✅ Users can **update** their own workspace
- ✅ Users can **delete** their own workspace
- ✅ RLS is properly enabled

---

## 🔍 Alternative: Manual Policy Check

If you prefer to check/update policies manually:

1. Go to **Authentication** → **Policies** in Supabase
2. Find the `workspaces` table
3. Check that there's an **INSERT** policy that allows:
   ```sql
   auth.uid() = owner_id
   ```
4. If it doesn't exist or is wrong, create/update it

---

## ✅ That's It!

After running the migration, workspace creation should work and task creation will succeed!

**No redeployment needed** - RLS policies are database-level changes that take effect immediately.




