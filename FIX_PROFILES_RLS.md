# Fix: Profiles RLS Policy Error

## 🚨 The Error

```
Failed to create task: Failed to create profile: new row violates row-level security policy for table "profiles"
```

This means the Row Level Security (RLS) policy on the `profiles` table is blocking profile creation.

---

## ✅ Quick Fix (2 minutes)

### Step 1: Run the RLS Fix in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **SQL Editor**
4. Click **"New query"**
5. Copy and paste the **entire contents** of `supabase/fix-profiles-rls.sql`
6. Click **"Run"** (or press Cmd/Ctrl + Enter)

This will:
- Drop existing policies (to avoid conflicts)
- Recreate policies that allow users to create their own profile
- Ensure RLS is enabled

### Step 2: Test

After running the SQL, try creating a task again. It should work!

---

## 🔍 What This Does

The fix ensures that:
- ✅ Users can **view** all profiles (or adjust to view only their own)
- ✅ Users can **insert** their own profile (critical for signup)
- ✅ Users can **update** their own profile
- ✅ RLS is properly enabled

---

## 🔍 Alternative: Manual Policy Check

If you prefer to check/update policies manually:

1. Go to **Authentication** → **Policies** in Supabase
2. Find the `profiles` table
3. Check that there's an **INSERT** policy that allows:
   ```sql
   auth.uid() = id
   ```
4. If it doesn't exist or is wrong, create/update it

---

## ✅ That's It!

After running the migration, profile creation should work and task creation will succeed!


