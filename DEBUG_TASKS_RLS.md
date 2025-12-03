# Debug: Tasks RLS Policy Not Working

## 🔍 Step 1: Verify Policies Exist

Run this in Supabase SQL Editor to check if policies are set up:

```sql
-- Check if RLS is enabled
SELECT 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'tasks';

-- List all policies on tasks table
SELECT 
    policyname,
    cmd as operation,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies 
WHERE tablename = 'tasks';
```

**Expected Result:** You should see 4 policies (SELECT, INSERT, UPDATE, DELETE)

---

## 🔍 Step 2: Try the Enhanced Fix

If policies don't exist or look wrong, run `supabase/fix-tasks-rls-v2.sql`:

1. This version is more aggressive - it drops ALL existing policies first
2. Then recreates them with explicit checks
3. Shows you what was created at the end

---

## 🔍 Step 3: Check Common Issues

### Issue 1: user_id is NULL
The RLS policy checks `auth.uid() = user_id`. If `user_id` is NULL in your insert, it will fail.

**Check:** Look at the insert statement in `src/app/actions.ts` line 154 - it should set `user_id: user.id`

### Issue 2: Policy Not Active
Sometimes policies need to be refreshed.

**Fix:** Run the fix again, or manually check in Supabase Dashboard → Authentication → Policies

### Issue 3: Wrong Policy Condition
The policy should be:
```sql
WITH CHECK ( auth.uid() = user_id )
```

Not:
```sql
WITH CHECK ( auth.uid() = owner_id )  -- Wrong!
```

---

## 🔍 Step 4: Test with a Simple Query

Try this in Supabase SQL Editor (while logged in as a user):

```sql
-- This should return your user ID
SELECT auth.uid() as current_user_id;

-- This should show your tasks (if any exist)
SELECT id, title, user_id 
FROM tasks 
WHERE user_id = auth.uid();
```

---

## 🔍 Step 5: Check Server Logs

If it's still failing, check the actual error in:
- Browser console (F12)
- Vercel logs (if deployed)
- Supabase logs (Dashboard → Logs)

Look for the exact error message - it might give more clues.

---

## ✅ Quick Fix: Run Enhanced Version

If nothing else works, try `supabase/fix-tasks-rls-v2.sql` - it's more thorough and will show you what policies were created.

