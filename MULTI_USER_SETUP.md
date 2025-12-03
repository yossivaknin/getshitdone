# Multi-User Setup Guide

## ✅ What's Been Implemented

1. **Database Schema** - Already has user separation with RLS policies
2. **Server Actions** - Created functions to fetch/create/update/delete user-specific tasks
3. **UI Integration** - Updated main page and Board component to use database
4. **User Isolation** - All tasks are scoped to the logged-in user via `user_id`

---

## 🔧 Step 1: Update Database Schema (5 minutes)

You need to run the schema updates in your Supabase database to ensure full user separation.

### Option A: Via Supabase SQL Editor (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **SQL Editor**
4. Click **"New query"**
5. Copy and paste the contents of `supabase/schema-updates.sql`
6. Click **"Run"** (or press Cmd/Ctrl + Enter)

### Option B: Via Supabase CLI

```bash
supabase db push
```

**What this does:**
- Adds delete policies for tasks, lists, workspaces, and tags
- Ensures `user_id` is NOT NULL for tasks (critical for security)
- Adds indexes for better query performance

---

## ✅ Step 2: Verify Database Setup

After running the schema updates, verify:

1. **Tasks table has `user_id` NOT NULL:**
   - Go to Supabase Dashboard → **Table Editor** → **tasks**
   - Check that `user_id` column exists and is NOT NULL

2. **RLS policies are enabled:**
   - Go to **Authentication** → **Policies**
   - Verify policies exist for:
     - `tasks` (select, insert, update, delete)
     - `tags` (select, insert, update, delete)
     - `lists` (select, insert, update, delete)
     - `workspaces` (select, insert, update, delete)

---

## 🧪 Step 3: Test Multi-User Functionality

### Test 1: Create Tasks as User A
1. Sign up/login as User A
2. Create a few tasks
3. Verify they appear in your board

### Test 2: Verify User Isolation
1. Log out
2. Sign up/login as User B (different email)
3. Verify:
   - You see an empty board (no tasks from User A)
   - You can create your own tasks
   - Tasks are isolated to your account

### Test 3: Test Task Operations
1. Create a task
2. Edit a task
3. Drag a task between columns
4. Delete a task
5. Verify all operations persist and work correctly

---

## 🔍 How It Works

### User Separation
- Every task has a `user_id` field that links it to the authenticated user
- Row Level Security (RLS) policies ensure users can only:
  - **View** their own tasks
  - **Create** tasks with their own `user_id`
  - **Update** their own tasks
  - **Delete** their own tasks

### Data Flow
1. **User logs in** → Supabase Auth creates session
2. **Page loads** → `getTasks()` fetches only tasks where `user_id = current_user.id`
3. **User creates task** → `createTask()` automatically sets `user_id = current_user.id`
4. **User updates task** → `updateTask()` verifies task belongs to user before updating
5. **User deletes task** → `deleteTask()` verifies task belongs to user before deleting

### Security
- **Database Level:** RLS policies prevent users from accessing other users' data
- **Application Level:** Server actions verify `user_id` matches current user
- **No Shared Data:** Each user has completely isolated data

---

## 📋 Current Status

✅ **Completed:**
- Database schema with user separation
- Server actions for CRUD operations
- UI integration with database
- Task creation/editing/deletion
- Drag-and-drop status updates

⚠️ **Needs Testing:**
- Run schema updates in Supabase
- Test with multiple user accounts
- Verify all operations work correctly

---

## 🆘 Troubleshooting

### "Tasks not loading"
- Check that schema updates were run
- Verify `user_id` column exists in `tasks` table
- Check browser console for errors
- Verify Supabase environment variables are set

### "Can't create tasks"
- Check RLS policies are enabled
- Verify user is authenticated
- Check server logs for errors

### "Tasks from other users visible"
- This should NOT happen if RLS is working
- Verify schema updates were run
- Check that `user_id` is NOT NULL
- Verify RLS policies are active

---

## 🎯 Next Steps

1. **Run schema updates** (Step 1 above)
2. **Test with multiple accounts** (Step 3 above)
3. **Verify everything works**
4. **Deploy to production**

Once schema updates are run, each user will have their own completely isolated board!

