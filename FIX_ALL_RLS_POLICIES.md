# Complete RLS Policy Fix Guide

## 🚨 The Problem

You're getting RLS (Row Level Security) policy errors when trying to create tasks. This is because the database policies need to be set up correctly.

---

## ✅ Complete Fix (5 minutes)

Run these **3 SQL migrations** in order in Supabase SQL Editor:

### Step 1: Fix Profiles RLS
1. Open `supabase/fix-profiles-rls.sql`
2. Copy and paste into Supabase SQL Editor
3. Click "Run"
4. ✅ Confirm it ran successfully

### Step 2: Fix Workspaces RLS
1. Open `supabase/fix-workspaces-rls.sql`
2. Copy and paste into Supabase SQL Editor
3. Click "Run"
4. ✅ Confirm it ran successfully

### Step 3: Fix Tasks RLS
1. Open `supabase/fix-tasks-rls.sql`
2. Copy and paste into Supabase SQL Editor
3. Click "Run"
4. ✅ Confirm it ran successfully

---

## 🔍 What Each Fix Does

### Profiles (`fix-profiles-rls.sql`)
- Allows users to create their own profile
- Allows users to view/update their own profile

### Workspaces (`fix-workspaces-rls.sql`)
- Allows users to create their own workspace
- Allows users to view/update/delete their own workspace

### Tasks (`fix-tasks-rls.sql`)
- Allows users to create their own tasks
- Allows users to view/update/delete their own tasks

---

## ⚠️ About the "Destructive Operation" Warning

Supabase will show a warning for each migration. **This is safe!** The warning appears because we're using `DROP POLICY`, but:
- We use `IF EXISTS` so it won't break if policies don't exist
- We immediately recreate the policies with correct configuration
- No data is deleted, only policy definitions are updated

**Click "Run this query" to proceed.**

---

## ✅ After Running All Three

Once all three migrations are complete:
1. Try creating a task in your app
2. It should work! 🎉

The flow will be:
- User creates task → Profile created (if needed) → Workspace created (if needed) → Task created

---

## 🔍 Verify Policies Are Set

To verify all policies are in place:

1. Go to **Authentication** → **Policies** in Supabase
2. Check that these tables have policies:
   - ✅ `profiles` - Should have SELECT, INSERT, UPDATE policies
   - ✅ `workspaces` - Should have SELECT, INSERT, UPDATE, DELETE policies
   - ✅ `tasks` - Should have SELECT, INSERT, UPDATE, DELETE policies

---

## 🆘 Still Having Issues?

If you're still getting errors after running all three:

1. **Check the error message** - Which table is it complaining about?
2. **Verify RLS is enabled** - Go to Table Editor → Check "RLS enabled" toggle
3. **Check policy conditions** - Make sure policies use `auth.uid() = user_id` (or `owner_id` for workspaces)

---

## 📋 Quick Reference

| Table | Required Policies | File |
|-------|------------------|------|
| `profiles` | SELECT, INSERT, UPDATE | `fix-profiles-rls.sql` |
| `workspaces` | SELECT, INSERT, UPDATE, DELETE | `fix-workspaces-rls.sql` |
| `tasks` | SELECT, INSERT, UPDATE, DELETE | `fix-tasks-rls.sql` |

---

**No redeployment needed** - RLS policies are database-level and take effect immediately!




