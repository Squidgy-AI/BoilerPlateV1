-- 🔧 FINAL MIGRATION: Fix NOT NULL constraint issues
-- This properly handles existing data and schema changes

-- ==========================================
-- 1. FIX squidgy_agent_business_setup table
-- ==========================================

-- Step 1: Add missing columns as nullable first
ALTER TABLE public.squidgy_agent_business_setup 
ADD COLUMN IF NOT EXISTS setup_type character varying(50);

ALTER TABLE public.squidgy_agent_business_setup 
ADD COLUMN IF NOT EXISTS session_id character varying(255);

-- Step 2: Update existing records to have default setup_type values
-- This prevents NOT NULL constraint violations
UPDATE public.squidgy_agent_business_setup 
SET setup_type = 'SOLSolar' 
WHERE setup_type IS NULL AND agent_id = 'SOLAgent';

-- Step 3: Make setup_type NOT NULL after populating data
ALTER TABLE public.squidgy_agent_business_setup 
ALTER COLUMN setup_type SET NOT NULL;

-- Step 4: Drop the existing primary key constraint safely
ALTER TABLE public.squidgy_agent_business_setup 
DROP CONSTRAINT IF EXISTS squidgy_agent_business_setup_pkey;

-- Step 5: Remove any duplicate records that might conflict with new primary key
-- Keep only the most recent record for each (firm_user_id, agent_id, setup_type) combination
DELETE FROM public.squidgy_agent_business_setup a
USING public.squidgy_agent_business_setup b 
WHERE a.ctid < b.ctid 
AND a.firm_user_id = b.firm_user_id 
AND a.agent_id = b.agent_id 
AND a.setup_type = b.setup_type;

-- Step 6: Create new composite primary key with setup_type
ALTER TABLE public.squidgy_agent_business_setup 
ADD CONSTRAINT squidgy_agent_business_setup_pkey 
PRIMARY KEY (firm_user_id, agent_id, setup_type);

-- Step 7: Add indexes for performance
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
-- 4. CLEAN UP EXISTING DATA ISSUES
-- ==========================================

-- Remove any records that might have conflicting data structure
-- This ensures a clean slate for the new schema
DELETE FROM public.squidgy_agent_business_setup 
WHERE setup_type IS NULL;

-- ==========================================
-- 5. VERIFICATION QUERIES
-- ==========================================

-- Check squidgy_agent_business_setup structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'squidgy_agent_business_setup' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check chat_history structure  
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'chat_history' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current data
SELECT 
    firm_user_id,
    agent_id, 
    setup_type,
    is_enabled,
    created_at
FROM public.squidgy_agent_business_setup 
ORDER BY created_at DESC 
LIMIT 5;

-- Verify no policies exist
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE tablename IN ('squidgy_agent_business_setup', 'chat_history')
ORDER BY tablename, policyname;