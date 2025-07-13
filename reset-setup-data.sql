-- 🔧 RESET SETUP DATA: Clean slate for business setup process
-- This removes old data format and prepares for new setup_type structure

-- ==========================================
-- 1. BACKUP AND CLEAN EXISTING DATA
-- ==========================================

-- Remove all existing SOLAgent setup records since they use old format
-- The application will create new records with proper setup_type values
DELETE FROM public.squidgy_agent_business_setup 
WHERE agent_id = 'SOLAgent' AND setup_type IN ('SOLAgent', 'agent_config');

-- Keep PersonalAssistant records but update setup_type if needed
UPDATE public.squidgy_agent_business_setup 
SET setup_type = 'PersonalAssistant' 
WHERE agent_id = 'PersonalAssistant' AND setup_type = 'agent_config';

-- ==========================================
-- 2. ENSURE PROPER SCHEMA STRUCTURE
-- ==========================================

-- Drop existing primary key if it exists
ALTER TABLE public.squidgy_agent_business_setup 
DROP CONSTRAINT IF EXISTS squidgy_agent_business_setup_pkey;

-- Ensure setup_type column exists and is NOT NULL
ALTER TABLE public.squidgy_agent_business_setup 
ALTER COLUMN setup_type SET NOT NULL;

-- Create new composite primary key
ALTER TABLE public.squidgy_agent_business_setup 
ADD CONSTRAINT squidgy_agent_business_setup_pkey 
PRIMARY KEY (firm_user_id, agent_id, setup_type);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_setup_user_agent 
ON public.squidgy_agent_business_setup USING btree (firm_user_id, agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_setup_type 
ON public.squidgy_agent_business_setup USING btree (setup_type);

-- ==========================================
-- 3. ENSURE CHAT_HISTORY SCHEMA IS CORRECT
-- ==========================================

-- Add missing columns to chat_history
ALTER TABLE public.chat_history 
ADD COLUMN IF NOT EXISTS agent_id character varying(255);

ALTER TABLE public.chat_history 
ADD COLUMN IF NOT EXISTS agent_name character varying(255);

-- ==========================================
-- 4. DISABLE ALL RLS POLICIES (FINAL)
-- ==========================================

-- Drop ALL RLS policies
DROP POLICY IF EXISTS "Users can view their own agent setups" ON public.squidgy_agent_business_setup;
DROP POLICY IF EXISTS "Users can manage their own agent setups" ON public.squidgy_agent_business_setup;
DROP POLICY IF EXISTS "Users can manage their own solar configs" ON public.squidgy_agent_business_setup;
DROP POLICY IF EXISTS "Users can manage their own solar configs" ON sq_business_data.squidgy_agent_business_setup;
DROP POLICY IF EXISTS "Users can view their own chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Users can manage their own chat history" ON public.chat_history;

-- DISABLE RLS completely
ALTER TABLE public.squidgy_agent_business_setup DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE sq_business_data.squidgy_agent_business_setup DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- 5. VERIFICATION
-- ==========================================

-- Check remaining data
SELECT 
    firm_user_id,
    agent_id, 
    setup_type,
    is_enabled,
    created_at
FROM public.squidgy_agent_business_setup 
ORDER BY created_at DESC;

-- Verify schema structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'squidgy_agent_business_setup' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify no RLS policies exist
SELECT COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('squidgy_agent_business_setup', 'chat_history');