-- CLEANUP MIGRATION - Remove duplicate schema tables
-- Run this AFTER the main migration.sql

-- ============================================================================
-- STEP 1: HANDLE DUPLICATE SQUIDGY_AGENT_BUSINESS_SETUP TABLES
-- ============================================================================

-- Check if there's data in the sq_business_data schema table
DO $$ 
DECLARE
    data_count INTEGER;
    schema_exists BOOLEAN;
    table_exists BOOLEAN;
BEGIN
    -- Check if schema exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = 'sq_business_data'
    ) INTO schema_exists;
    
    IF NOT schema_exists THEN
        RAISE NOTICE 'sq_business_data schema does not exist - skipping';
        RETURN;
    END IF;
    
    -- Check if table exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'sq_business_data' 
        AND table_name = 'squidgy_agent_business_setup'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE 'sq_business_data.squidgy_agent_business_setup does not exist - skipping';
        RETURN;
    END IF;
    
    -- Count records in sq_business_data schema
    EXECUTE 'SELECT COUNT(*) FROM sq_business_data.squidgy_agent_business_setup' INTO data_count;
    
    RAISE NOTICE 'Records in sq_business_data.squidgy_agent_business_setup: %', data_count;
    
    -- If there's data, migrate it to public schema
    IF data_count > 0 THEN
        RAISE NOTICE 'Migrating data from sq_business_data to public schema...';
        
        INSERT INTO public.squidgy_agent_business_setup 
        SELECT * FROM sq_business_data.squidgy_agent_business_setup
        ON CONFLICT (firm_user_id, agent_id, setup_type) DO NOTHING;
        
        RAISE NOTICE 'Data migration completed';
    END IF;
    
END $$;

-- ============================================================================
-- STEP 2: DROP THE DUPLICATE TABLE AND SCHEMA (if safe)
-- ============================================================================

-- Drop the table in sq_business_data schema (if it exists)
DROP TABLE IF EXISTS sq_business_data.squidgy_agent_business_setup CASCADE;

-- Drop the schema if it's empty (this will fail if there are other objects)
DO $$ 
DECLARE
    schema_exists BOOLEAN;
BEGIN
    -- Check if schema exists first
    SELECT EXISTS(
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = 'sq_business_data'
    ) INTO schema_exists;
    
    IF schema_exists THEN
        DROP SCHEMA sq_business_data CASCADE;
        RAISE NOTICE 'Dropped sq_business_data schema';
    ELSE
        RAISE NOTICE 'sq_business_data schema does not exist';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop sq_business_data schema: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 3: ENSURE PROPER RLS ON PUBLIC TABLES ONLY
-- ============================================================================

-- Ensure RLS is enabled on public.squidgy_agent_business_setup
ALTER TABLE public.squidgy_agent_business_setup ENABLE ROW LEVEL SECURITY;

-- Ensure RLS is disabled on public.business_profiles
ALTER TABLE public.business_profiles DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check final schema state
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('profiles', 'business_profiles', 'squidgy_agent_business_setup')
ORDER BY schemaname, tablename;

-- Check if sq_business_data schema still exists
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'sq_business_data';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. This migration safely handles the duplicate table situation
-- 2. Migrates any existing data from sq_business_data to public schema
-- 3. Removes the duplicate table and schema if safe to do so
-- 4. Ensures proper RLS settings on the correct tables
-- 5. After this, you should only have tables in the public schema