# Setting Up Supabase for Token Storage

## ✅ Environment Variables (Already Set)

You have these in `.env.local`:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

These are **all you need** for writing to `user_tokens` table from the web app.

## ⚠️ Important: RLS Policies

The `user_tokens` table uses **Row Level Security (RLS)**. You need policies that allow:
- Users to INSERT their own tokens
- Users to UPDATE their own tokens
- Users to SELECT their own tokens

## 📝 Setup Steps

### 1. Check if RLS Policies Exist

Go to Supabase Dashboard → SQL Editor and run:

```sql
-- Check existing policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_tokens';
```

### 2. If Policies Don't Exist, Create Them

Run this SQL in Supabase SQL Editor:

```sql
-- Enable RLS (if not already enabled)
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tokens
CREATE POLICY IF NOT EXISTS "Users can view own tokens" 
ON user_tokens
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own tokens
CREATE POLICY IF NOT EXISTS "Users can insert own tokens" 
ON user_tokens
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tokens
CREATE POLICY IF NOT EXISTS "Users can update own tokens" 
ON user_tokens
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### 3. Test in Web App

1. Make sure you're **logged in** on web
2. Go to **Settings** → **Connect Google Calendar**
3. Complete OAuth flow
4. Check browser console for:
   - `[Settings] ✅ Tokens saved to database successfully`
   - Or any RLS policy errors

### 4. Verify Tokens Were Saved

Run:
```bash
node check-supabase-tokens.js
```

Should show 1 row with your tokens.

## 🔍 Troubleshooting

**If you see RLS errors:**
- Make sure policies are created (step 2)
- Make sure you're logged in when connecting
- Check browser console for exact error message

**If tokens aren't saving:**
- Check browser console for errors
- Verify you're authenticated (user must be logged in)
- Verify RLS policies exist and allow INSERT/UPDATE
