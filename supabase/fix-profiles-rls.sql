-- Fix RLS policies for profiles table
-- This allows users to create their own profile on signup

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;

-- Recreate policies with proper checks

-- Allow users to view all profiles (or just their own - adjust as needed)
CREATE POLICY "Public profiles are viewable by everyone."
  ON profiles FOR SELECT
  USING ( true );

-- Allow users to insert their own profile
-- This is critical for signup flow
CREATE POLICY "Users can insert their own profile."
  ON profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile."
  ON profiles FOR UPDATE
  USING ( auth.uid() = id );

-- Verify RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;




