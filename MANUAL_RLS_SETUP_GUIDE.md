# Manual RLS Policy Setup Guide - Step by Step

This guide walks you through manually creating RLS policies in the Supabase Dashboard.

---

## 📋 Overview

We need to create RLS policies for 3 tables:
1. **profiles** - So users can create their own profile
2. **workspaces** - So users can create their own workspace
3. **tasks** - So users can create their own tasks

---

## 🔧 Step 1: Enable RLS on All Tables

### For each table (profiles, workspaces, tasks):

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Click **"Table Editor"** in the left sidebar
4. Click on the table name (e.g., `profiles`)
5. Look for **"RLS enabled"** toggle at the top
6. **Turn it ON** (toggle should be green/blue)
7. Repeat for `workspaces` and `tasks`

---

## 🔧 Step 2: Create Policies for `profiles` Table

1. Go to **"Authentication"** → **"Policies"** in the left sidebar
2. Find **"profiles"** in the table list
3. Click **"New Policy"** button (top right)

### Policy 1: SELECT (View Profiles)

1. **Policy name:** `Users can view profiles`
2. **Allowed operation:** `SELECT`
3. **Policy definition:** Click **"Use a custom expression"**
4. **USING expression:** 
   ```sql
   true
   ```
5. Click **"Review"** → **"Save policy"**

### Policy 2: INSERT (Create Profile)

1. Click **"New Policy"** again
2. **Policy name:** `Users can insert their own profile`
3. **Allowed operation:** `INSERT`
4. **Policy definition:** Click **"Use a custom expression"**
5. **WITH CHECK expression:**
   ```sql
   auth.uid() = id
   ```
6. Click **"Review"** → **"Save policy"**

### Policy 3: UPDATE (Update Profile)

1. Click **"New Policy"** again
2. **Policy name:** `Users can update own profile`
3. **Allowed operation:** `UPDATE`
4. **Policy definition:** Click **"Use a custom expression"**
5. **USING expression:**
   ```sql
   auth.uid() = id
   ```
6. **WITH CHECK expression:**
   ```sql
   auth.uid() = id
   ```
7. Click **"Review"** → **"Save policy"**

---

## 🔧 Step 3: Create Policies for `workspaces` Table

1. In **"Authentication"** → **"Policies"**, find **"workspaces"**
2. Click **"New Policy"** button

### Policy 1: SELECT (View Workspaces)

1. **Policy name:** `Users can view workspaces they own`
2. **Allowed operation:** `SELECT`
3. **Policy definition:** Click **"Use a custom expression"**
4. **USING expression:**
   ```sql
   auth.uid() = owner_id
   ```
5. Click **"Review"** → **"Save policy"**

### Policy 2: INSERT (Create Workspace)

1. Click **"New Policy"** again
2. **Policy name:** `Users can insert workspaces`
3. **Allowed operation:** `INSERT`
4. **Policy definition:** Click **"Use a custom expression"**
5. **WITH CHECK expression:**
   ```sql
   auth.uid() = owner_id
   ```
6. Click **"Review"** → **"Save policy"**

### Policy 3: UPDATE (Update Workspace)

1. Click **"New Policy"** again
2. **Policy name:** `Users can update their own workspaces`
3. **Allowed operation:** `UPDATE`
4. **Policy definition:** Click **"Use a custom expression"**
5. **USING expression:**
   ```sql
   auth.uid() = owner_id
   ```
6. **WITH CHECK expression:**
   ```sql
   auth.uid() = owner_id
   ```
7. Click **"Review"** → **"Save policy"**

### Policy 4: DELETE (Delete Workspace)

1. Click **"New Policy"** again
2. **Policy name:** `Users can delete their own workspaces`
3. **Allowed operation:** `DELETE`
4. **Policy definition:** Click **"Use a custom expression"**
5. **USING expression:**
   ```sql
   auth.uid() = owner_id
   ```
6. Click **"Review"** → **"Save policy"**

---

## 🔧 Step 4: Create Policies for `tasks` Table

1. In **"Authentication"** → **"Policies"**, find **"tasks"**
2. Click **"New Policy"** button

### Policy 1: SELECT (View Tasks)

1. **Policy name:** `Users can view their own tasks`
2. **Allowed operation:** `SELECT`
3. **Policy definition:** Click **"Use a custom expression"**
4. **USING expression:**
   ```sql
   auth.uid() = user_id
   ```
5. Click **"Review"** → **"Save policy"**

### Policy 2: INSERT (Create Task) ⚠️ THIS IS THE CRITICAL ONE

1. Click **"New Policy"** again
2. **Policy name:** `Users can insert their own tasks`
3. **Allowed operation:** `INSERT`
4. **Policy definition:** Click **"Use a custom expression"**
5. **WITH CHECK expression:**
   ```sql
   auth.uid() = user_id
   ```
6. Click **"Review"** → **"Save policy"**

**⚠️ IMPORTANT:** Make sure this policy exists and uses `user_id`, not `owner_id`!

### Policy 3: UPDATE (Update Task)

1. Click **"New Policy"** again
2. **Policy name:** `Users can update their own tasks`
3. **Allowed operation:** `UPDATE`
4. **Policy definition:** Click **"Use a custom expression"**
5. **USING expression:**
   ```sql
   auth.uid() = user_id
   ```
6. **WITH CHECK expression:**
   ```sql
   auth.uid() = user_id
   ```
7. Click **"Review"** → **"Save policy"**

### Policy 4: DELETE (Delete Task)

1. Click **"New Policy"** again
2. **Policy name:** `Users can delete their own tasks`
3. **Allowed operation:** `DELETE`
4. **Policy definition:** Click **"Use a custom expression"**
5. **USING expression:**
   ```sql
   auth.uid() = user_id
   ```
6. Click **"Review"** → **"Save policy"**

---

## ✅ Step 5: Verify All Policies

After creating all policies, verify they exist:

1. Go to **"Authentication"** → **"Policies"**
2. For each table (`profiles`, `workspaces`, `tasks`), you should see:
   - ✅ SELECT policy
   - ✅ INSERT policy
   - ✅ UPDATE policy
   - ✅ DELETE policy (for workspaces and tasks)

**Expected counts:**
- `profiles`: 3 policies (SELECT, INSERT, UPDATE)
- `workspaces`: 4 policies (SELECT, INSERT, UPDATE, DELETE)
- `tasks`: 4 policies (SELECT, INSERT, UPDATE, DELETE)

---

## 🔍 Step 6: Test Task Creation

1. Go to your app
2. Try creating a task
3. It should work now! 🎉

---

## 🆘 Troubleshooting

### "Policy already exists" error
- Delete the old policy first, then create the new one
- Or edit the existing policy to match the correct expression

### Still getting RLS error
1. **Double-check the INSERT policy on `tasks`** - Make sure it uses:
   ```sql
   auth.uid() = user_id
   ```
   NOT `owner_id`!

2. **Verify RLS is enabled** - Go to Table Editor → Check the toggle is ON

3. **Check the policy name** - Make sure it's exactly:
   - `Users can insert their own tasks` (for tasks table)

4. **Verify USING vs WITH CHECK:**
   - For INSERT: Use **WITH CHECK** only
   - For UPDATE: Use both **USING** and **WITH CHECK**
   - For SELECT/DELETE: Use **USING** only

---

## 📸 Visual Guide

When creating a policy, you'll see:
- **Policy name** field (top)
- **Allowed operation** dropdown (SELECT, INSERT, UPDATE, DELETE)
- **Policy definition** section with:
  - "Use a custom expression" button
  - Text area for SQL expression

Make sure to:
1. Enter a clear policy name
2. Select the correct operation
3. Click "Use a custom expression"
4. Enter the SQL expression
5. Click "Review"
6. Click "Save policy"

---

## ✅ Summary Checklist

- [ ] RLS enabled on `profiles` table
- [ ] RLS enabled on `workspaces` table
- [ ] RLS enabled on `tasks` table
- [ ] 3 policies created for `profiles` (SELECT, INSERT, UPDATE)
- [ ] 4 policies created for `workspaces` (SELECT, INSERT, UPDATE, DELETE)
- [ ] 4 policies created for `tasks` (SELECT, INSERT, UPDATE, DELETE)
- [ ] `tasks` INSERT policy uses `auth.uid() = user_id`
- [ ] Tested task creation - it works!

---

**That's it!** After completing all steps, task creation should work.

