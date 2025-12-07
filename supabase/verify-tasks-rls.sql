-- Verify Tasks RLS Policies
-- Run this to check if policies are set up correctly

-- Check if RLS is enabled
SELECT 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'tasks';

-- List all policies on tasks table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'tasks';

-- Test: Try to see what auth.uid() returns (this will show NULL if not authenticated)
-- This is just for verification - you need to be authenticated to test insert
SELECT auth.uid() as current_user_id;


