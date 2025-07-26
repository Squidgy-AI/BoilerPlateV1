-- MIGRATION SQL FOR SQUIDGY DATABASE
-- Run this in your Supabase SQL Editor to update your database schema

-- ============================================================================
-- STEP 1: UPDATE PROFILES TABLE
-- ============================================================================

-- Rename avatar_url to profile_avatar_url
ALTER TABLE public.profiles 
RENAME COLUMN avatar_url TO profile_avatar_url;

-- Remove the foreign key constraint to companies table (if it exists)
-- This will fail gracefully if the constraint doesn't exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_profiles_company' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT fk_profiles_company;
    END IF;
END $$;

-- Make company_id NOT NULL (it should always be generated during signup)
-- First, set any NULL company_id values to a random UUID
UPDATE public.profiles 
SET company_id = gen_random_uuid() 
WHERE company_id IS NULL;

ALTER TABLE public.profiles 
ALTER COLUMN company_id SET NOT NULL;

-- ============================================================================
-- STEP 2: UPDATE BUSINESS_PROFILES TABLE
-- ============================================================================

-- Make business_name and business_email nullable (we only insert firm_user_id and firm_id initially)
ALTER TABLE public.business_profiles 
ALTER COLUMN business_name DROP NOT NULL;

ALTER TABLE public.business_profiles 
ALTER COLUMN business_email DROP NOT NULL;

-- Add unique constraint on firm_user_id for UPSERT operations
-- This will fail gracefully if the constraint already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'business_profiles_firm_user_id_key' 
        AND table_name = 'business_profiles'
    ) THEN
        ALTER TABLE public.business_profiles 
        ADD CONSTRAINT business_profiles_firm_user_id_key UNIQUE (firm_user_id);
    END IF;
END $$;

-- ============================================================================
-- STEP 3: CREATE MISSING FUNCTIONS (if they don't exist)
-- ============================================================================

-- Function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function for business_profiles updated_at
CREATE OR REPLACE FUNCTION update_business_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- STEP 4: ENSURE ALL TRIGGERS EXIST
-- ============================================================================

-- Drop and recreate triggers to ensure they exist
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_business_profiles_updated_at ON public.business_profiles;
CREATE TRIGGER trigger_update_business_profiles_updated_at 
  BEFORE UPDATE ON public.business_profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_business_profiles_updated_at();

-- ============================================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on profiles (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on squidgy_agent_business_setup (if not already enabled)
ALTER TABLE public.squidgy_agent_business_setup ENABLE ROW LEVEL SECURITY;

-- NO RLS on business_profiles (as requested)
ALTER TABLE public.business_profiles DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: CREATE RLS POLICIES (if they don't exist)
-- ============================================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own agent setups" ON public.squidgy_agent_business_setup;
DROP POLICY IF EXISTS "Users can insert own agent setups" ON public.squidgy_agent_business_setup;
DROP POLICY IF EXISTS "Users can update own agent setups" ON public.squidgy_agent_business_setup;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Agent setup policies
CREATE POLICY "Users can view own agent setups" ON public.squidgy_agent_business_setup
  FOR SELECT USING (
    firm_user_id IN (
      SELECT user_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own agent setups" ON public.squidgy_agent_business_setup
  FOR INSERT WITH CHECK (
    firm_user_id IN (
      SELECT user_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own agent setups" ON public.squidgy_agent_business_setup
  FOR UPDATE USING (
    firm_user_id IN (
      SELECT user_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify the migration worked:

-- Check if profile_avatar_url column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'profile_avatar_url';

-- Check if company_id is NOT NULL
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'company_id';

-- Check business_profiles constraints
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'business_profiles';

-- Check if business_name and business_email are nullable
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'business_profiles' 
AND column_name IN ('business_name', 'business_email');

-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('profiles', 'business_profiles', 'squidgy_agent_business_setup');

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. This migration updates the profiles table to use profile_avatar_url
-- 2. Makes company_id NOT NULL (required for all users)
-- 3. Makes business_name and business_email nullable in business_profiles
-- 4. Adds unique constraint on business_profiles.firm_user_id for UPSERT
-- 5. Ensures all triggers and functions exist
-- 6. Sets up proper RLS policies
-- 7. Removes dependency on companies table
-- 8. After running this migration, your signup process should work correctly