-- REMOVE ALL REMAINING POLICIES
-- Run this to clean up all remaining RLS policies

-- ============================================================================
-- DROP ALL REMAINING POLICIES ON USERS_FORGOT_PASSWORD
-- ============================================================================

DROP POLICY IF EXISTS "Public can insert password reset requests" ON public.users_forgot_password;
DROP POLICY IF EXISTS "Users can view their own forgot password records" ON public.users_forgot_password;
DROP POLICY IF EXISTS "Users can insert their own forgot password records" ON public.users_forgot_password;
DROP POLICY IF EXISTS "Users can update their own forgot password records" ON public.users_forgot_password;
DROP POLICY IF EXISTS "Users can view their own password reset requests" ON public.users_forgot_password;
DROP POLICY IF EXISTS "Service role can manage all password resets" ON public.users_forgot_password;

-- ============================================================================
-- DROP ALL REMAINING POLICIES ON PROFILES
-- ============================================================================

DROP POLICY IF EXISTS "Public can view profiles for password reset" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- ============================================================================
-- ENSURE RLS IS DISABLED ON ALL TABLES
-- ============================================================================

ALTER TABLE public.users_forgot_password DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.squidgy_agent_business_setup DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check RLS status (should all be false)
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('profiles', 'business_profiles', 'squidgy_agent_business_setup', 'users_forgot_password')
AND schemaname = 'public'
ORDER BY tablename;

-- Check for any remaining policies (should return no rows)
SELECT schemaname, tablename, policyname
FROM pg_policies 
WHERE tablename IN ('profiles', 'business_profiles', 'squidgy_agent_business_setup', 'users_forgot_password')
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. All RLS policies have been completely removed
-- 2. All RLS is disabled on all tables
-- 3. Full unrestricted access to all data
-- 4. No security restrictions at the database level