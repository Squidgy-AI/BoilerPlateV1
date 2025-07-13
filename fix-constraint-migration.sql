-- 🔧 FIX CHECK CONSTRAINT: Update allowed setup_type values
-- This adds our new setup_type values to the constraint

-- ==========================================
-- 1. UPDATE CHECK CONSTRAINT
-- ==========================================

-- Drop the existing check constraint
ALTER TABLE public.squidgy_agent_business_setup 
DROP CONSTRAINT IF EXISTS valid_setup_types;

-- Create new check constraint with our new setup_type values
ALTER TABLE public.squidgy_agent_business_setup 
ADD CONSTRAINT valid_setup_types CHECK (
  setup_type::text = ANY (ARRAY[
    'agent_config'::text,
    'SolarSetup'::text,
    'CalendarSetup'::text, 
    'NotificationSetup'::text,
    'SOLAgent'::text,
    'SOLSolar'::text,
    'SOLCalendar'::text,
    'SOLNotification'::text,
    'PersonalAssistant'::text
  ])
);

-- ==========================================
-- 2. CLEAN UP EXISTING DATA
-- ==========================================

-- Remove old SOLAgent records that use wrong format
DELETE FROM public.squidgy_agent_business_setup 
WHERE agent_id = 'SOLAgent' AND setup_type = 'SOLAgent';

-- Update PersonalAssistant records to use correct setup_type
UPDATE public.squidgy_agent_business_setup 
SET setup_type = 'agent_config' 
WHERE agent_id = 'PersonalAssistant' AND setup_type = 'PersonalAssistant';

-- ==========================================
-- 3. DISABLE ALL RLS POLICIES
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

-- ==========================================
-- 4. ENSURE CHAT_HISTORY SCHEMA
-- ==========================================

-- Add missing columns to chat_history
ALTER TABLE public.chat_history 
ADD COLUMN IF NOT EXISTS agent_id character varying(255);

ALTER TABLE public.chat_history 
ADD COLUMN IF NOT EXISTS agent_name character varying(255);

-- ==========================================
-- 5. VERIFICATION
-- ==========================================

-- Check the constraint was updated
SELECT 
    conname as constraint_name,
    consrc as constraint_definition
FROM pg_constraint 
WHERE conname = 'valid_setup_types' 
AND conrelid = 'public.squidgy_agent_business_setup'::regclass;

-- Check remaining data
SELECT 
    firm_user_id,
    agent_id, 
    setup_type,
    is_enabled,
    created_at
FROM public.squidgy_agent_business_setup 
ORDER BY created_at DESC;

-- Verify no RLS policies exist
SELECT COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('squidgy_agent_business_setup', 'chat_history');