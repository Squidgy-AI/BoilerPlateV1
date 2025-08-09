-- DISABLE ALL RLS AND POLICIES
-- Run this to remove all Row Level Security

-- ============================================================================
-- STEP 1: DISABLE RLS ON ALL TABLES
-- ============================================================================

-- Disable RLS on profiles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Disable RLS on business_profiles  
ALTER TABLE public.business_profiles DISABLE ROW LEVEL SECURITY;

-- Disable RLS on squidgy_agent_business_setup
ALTER TABLE public.squidgy_agent_business_setup DISABLE ROW LEVEL SECURITY;

-- LEGACY: Disable RLS on users_forgot_password (UNUSED TABLE - COMMENTED OUT)
-- ALTER TABLE public.users_forgot_password DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: DROP ALL EXISTING POLICIES
-- ============================================================================

-- Drop profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Drop agent setup policies
DROP POLICY IF EXISTS "Users can view own agent setups" ON public.squidgy_agent_business_setup;
DROP POLICY IF EXISTS "Users can insert own agent setups" ON public.squidgy_agent_business_setup;
DROP POLICY IF EXISTS "Users can update own agent setups" ON public.squidgy_agent_business_setup;

-- LEGACY: Drop forgot password policies (UNUSED TABLE - COMMENTED OUT)
-- DROP POLICY IF EXISTS "Allow public to create password reset requests" ON public.users_forgot_password;
-- DROP POLICY IF EXISTS "Users can view own password reset requests" ON public.users_forgot_password;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check RLS status (should all be false)
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('profiles', 'business_profiles', 'squidgy_agent_business_setup')
-- LEGACY: removed 'users_forgot_password' as table is unused
ORDER BY tablename;

-- Check for any remaining policies (should return no rows)
SELECT schemaname, tablename, policyname
FROM pg_policies 
WHERE tablename IN ('profiles', 'business_profiles', 'squidgy_agent_business_setup')
-- LEGACY: removed 'users_forgot_password' as table is unused;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. All RLS is now disabled - full access to all tables
-- 2. All policies have been removed
-- 3. This gives unrestricted access to all data
-- 4. Make sure your application handles security at the application level