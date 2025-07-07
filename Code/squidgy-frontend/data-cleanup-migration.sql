-- 🔧 DATA CLEANUP MIGRATION: Fix setup_type values to match application code
-- This aligns existing data with what the application expects

-- ==========================================
-- 1. FIX EXISTING DATA MISMATCH
-- ==========================================

-- The existing data has setup_type = 'SOLAgent' but code expects:
-- 'SOLSolar', 'SOLCalendar', 'SOLNotification'

-- Update existing SOLAgent records to use the new setup_type format
UPDATE public.squidgy_agent_business_setup 
SET setup_type = 'SOLSolar' 
WHERE agent_id = 'SOLAgent' AND setup_type = 'SOLAgent';

-- ==========================================
-- 2. ENSURE CLEAN PRIMARY KEY STRUCTURE
-- ==========================================

-- Drop existing primary key if it exists
ALTER TABLE public.squidgy_agent_business_setup 
DROP CONSTRAINT IF EXISTS squidgy_agent_business_setup_pkey;

-- Remove any potential duplicate records
DELETE FROM public.squidgy_agent_business_setup a
USING public.squidgy_agent_business_setup b 
WHERE a.ctid < b.ctid 
AND a.firm_user_id = b.firm_user_id 
AND a.agent_id = b.agent_id 
AND a.setup_type = b.setup_type;

-- Create new composite primary key
ALTER TABLE public.squidgy_agent_business_setup 
ADD CONSTRAINT squidgy_agent_business_setup_pkey 
PRIMARY KEY (firm_user_id, agent_id, setup_type);

-- ==========================================
-- 3. VERIFICATION AND TEST DATA
-- ==========================================

-- Check the updated data structure
SELECT 
    firm_user_id,
    agent_id, 
    setup_type,
    is_enabled,
    created_at
FROM public.squidgy_agent_business_setup 
WHERE agent_id = 'SOLAgent'
ORDER BY created_at DESC;

-- Verify the primary key constraint
SELECT 
    tc.constraint_name, 
    tc.table_name,
    tc.constraint_type,
    STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'squidgy_agent_business_setup'
AND tc.constraint_type = 'PRIMARY KEY'
GROUP BY tc.constraint_name, tc.table_name, tc.constraint_type;