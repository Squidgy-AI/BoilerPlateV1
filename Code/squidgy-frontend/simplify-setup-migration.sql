-- 🔧 SIMPLIFY SETUP: Standardize SOL Agent to use agent_config like PersonalAssistant
-- This creates a clean, consistent setup pattern

-- ==========================================
-- 1. CLEAN UP EXISTING SOL AGENT DATA
-- ==========================================

-- Remove the old SOL Agent record with setup_type = 'SOLAgent'
DELETE FROM public.squidgy_agent_business_setup 
WHERE agent_id = 'SOLAgent' AND setup_type = 'SOLAgent';

-- ==========================================
-- 2. UPDATE CHECK CONSTRAINT  
-- ==========================================

-- Update constraint to reflect new simplified pattern
ALTER TABLE public.squidgy_agent_business_setup 
DROP CONSTRAINT IF EXISTS valid_setup_types;

ALTER TABLE public.squidgy_agent_business_setup 
ADD CONSTRAINT valid_setup_types CHECK (
  setup_type::text = ANY (ARRAY[
    'agent_config'::text,
    'SOLSolar'::text,
    'SOLCalendar'::text,
    'SOLNotification'::text
  ])
);

-- ==========================================
-- 3. VERIFICATION
-- ==========================================

-- Check clean data (should only see PersonalAssistant records now)
SELECT 
    firm_user_id,
    agent_id, 
    setup_type,
    is_enabled,
    created_at
FROM public.squidgy_agent_business_setup 
ORDER BY created_at DESC;