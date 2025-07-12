-- 🔧 DATABASE MIGRATION: Fix schema mismatches causing 406/400 errors
-- This script fixes the database schema to match what the application code expects

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
-- 3. FIX RLS Policies
-- ==========================================

-- Drop existing policy with type mismatch
DROP POLICY IF EXISTS "Users can view their own agent setups" ON public.squidgy_agent_business_setup;

-- Create new policy with correct data type comparison
CREATE POLICY "Users can view their own agent setups" 
ON public.squidgy_agent_business_setup 
FOR SELECT 
USING (auth.uid() = firm_user_id);

-- Add policy for insert/update operations
CREATE POLICY "Users can manage their own agent setups" 
ON public.squidgy_agent_business_setup 
FOR ALL 
USING (auth.uid() = firm_user_id)
WITH CHECK (auth.uid() = firm_user_id);

-- Fix chat_history RLS if it exists
DROP POLICY IF EXISTS "Users can view their own chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Users can manage their own chat history" ON public.chat_history;

CREATE POLICY "Users can view their own chat history" 
ON public.chat_history 
FOR SELECT 
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage their own chat history" 
ON public.chat_history 
FOR ALL 
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- ==========================================
-- 4. ENABLE RLS (if not already enabled)
-- ==========================================

ALTER TABLE public.squidgy_agent_business_setup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 5. VERIFICATION QUERIES
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

-- Check constraints
SELECT 
    tc.constraint_name, 
    tc.table_name,
    tc.constraint_type,
    STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN ('squidgy_agent_business_setup', 'chat_history')
GROUP BY tc.constraint_name, tc.table_name, tc.constraint_type
ORDER BY tc.table_name, tc.constraint_type;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('squidgy_agent_business_setup', 'chat_history')
ORDER BY tablename, policyname;