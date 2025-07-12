-- 🔧 SIMPLIFIED DATABASE MIGRATION: Fix schema and disable RLS policies
-- This removes all RLS policies to eliminate 406 errors

-- ==========================================
-- 1. FIX squidgy_agent_business_setup table
-- ==========================================

-- Step 1: Add missing columns
ALTER TABLE public.squidgy_agent_business_setup 
ADD COLUMN IF NOT EXISTS setup_type character varying(50);

ALTER TABLE public.squidgy_agent_business_setup 
ADD COLUMN IF NOT EXISTS session_id character varying(255);

-- Step 2: Drop the existing primary key constraint
ALTER TABLE public.squidgy_agent_business_setup 
DROP CONSTRAINT IF EXISTS squidgy_agent_business_setup_pkey;

-- Step 3: Create new composite primary key with setup_type
ALTER TABLE public.squidgy_agent_business_setup 
ADD CONSTRAINT squidgy_agent_business_setup_pkey 
PRIMARY KEY (firm_user_id, agent_id, setup_type);

-- Step 4: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_setup_user_agent 
ON public.squidgy_agent_business_setup USING btree (firm_user_id, agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_setup_type 
ON public.squidgy_agent_business_setup USING btree (setup_type);

-- ==========================================
-- 2. FIX chat_history table
-- ==========================================

-- Add missing columns that the code expects
ALTER TABLE public.chat_history 
ADD COLUMN IF NOT EXISTS agent_id character varying(255);

ALTER TABLE public.chat_history 
ADD COLUMN IF NOT EXISTS agent_name character varying(255);

-- ==========================================
-- 3. DISABLE ALL RLS POLICIES
-- ==========================================

-- Drop ALL existing RLS policies on squidgy_agent_business_setup (public schema)
DROP POLICY IF EXISTS "Users can view their own agent setups" ON public.squidgy_agent_business_setup;
DROP POLICY IF EXISTS "Users can manage their own agent setups" ON public.squidgy_agent_business_setup;
DROP POLICY IF EXISTS "Users can manage their own solar configs" ON public.squidgy_agent_business_setup;

-- Drop ALL existing RLS policies on squidgy_agent_business_setup (sq_business_data schema)
DROP POLICY IF EXISTS "Users can manage their own solar configs" ON sq_business_data.squidgy_agent_business_setup;

-- Drop ALL existing RLS policies on chat_history  
DROP POLICY IF EXISTS "Users can view their own chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Users can manage their own chat history" ON public.chat_history;

-- DISABLE RLS completely on all tables
ALTER TABLE public.squidgy_agent_business_setup DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on sq_business_data schema table if it exists
ALTER TABLE sq_business_data.squidgy_agent_business_setup DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. VERIFICATION QUERIES
-- ==========================================

-- Check squidgy_agent_business_setup structure
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'squidgy_agent_business_setup' 
ORDER BY ordinal_position;

-- Check chat_history structure  
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'chat_history' 
ORDER BY ordinal_position;

-- Check that RLS is disabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('squidgy_agent_business_setup', 'chat_history')
AND schemaname = 'public';

-- Verify no policies exist
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE tablename IN ('squidgy_agent_business_setup', 'chat_history')
ORDER BY tablename, policyname;