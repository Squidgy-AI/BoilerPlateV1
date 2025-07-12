-- 🔧 DATABASE SCHEMA FIX: Add agent_id to calendar and notification tables
-- This allows each agent to have separate calendar and notification configurations

-- ==========================================
-- 1. UPDATE business_calendar_setup table
-- ==========================================

-- Step 1: Add agent_id column
ALTER TABLE public.business_calendar_setup 
ADD COLUMN agent_id character varying(255);

-- Step 2: Drop old unique constraint
ALTER TABLE public.business_calendar_setup 
DROP CONSTRAINT IF EXISTS unique_user_calendar;

-- Step 3: Add new unique constraint with agent_id
ALTER TABLE public.business_calendar_setup 
ADD CONSTRAINT unique_user_agent_calendar UNIQUE (firm_user_id, agent_id);

-- Step 4: Add index for agent_id
CREATE INDEX IF NOT EXISTS idx_calendar_setup_agent 
ON public.business_calendar_setup USING btree (agent_id);

-- Step 5: Add composite index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_calendar_setup_user_agent 
ON public.business_calendar_setup USING btree (firm_user_id, agent_id);

-- ==========================================
-- 2. UPDATE business_notification_preferences table  
-- ==========================================

-- Step 1: Add agent_id column
ALTER TABLE public.business_notification_preferences 
ADD COLUMN agent_id character varying(255);

-- Step 2: Drop old unique constraint
ALTER TABLE public.business_notification_preferences 
DROP CONSTRAINT IF EXISTS unique_user_notifications;

-- Step 3: Add new unique constraint with agent_id
ALTER TABLE public.business_notification_preferences 
ADD CONSTRAINT unique_user_agent_notifications UNIQUE (firm_user_id, agent_id);

-- Step 4: Add index for agent_id
CREATE INDEX IF NOT EXISTS idx_notification_prefs_agent 
ON public.business_notification_preferences USING btree (agent_id);

-- Step 5: Add composite index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_agent 
ON public.business_notification_preferences USING btree (firm_user_id, agent_id);

-- ==========================================
-- 3. MIGRATION: Update existing records
-- ==========================================

-- For existing calendar setups without agent_id, set to 'SOLAgent'
UPDATE public.business_calendar_setup 
SET agent_id = 'SOLAgent' 
WHERE agent_id IS NULL;

-- For existing notification preferences without agent_id, set to 'SOLAgent'
UPDATE public.business_notification_preferences 
SET agent_id = 'SOLAgent' 
WHERE agent_id IS NULL;

-- Make agent_id NOT NULL after migration
ALTER TABLE public.business_calendar_setup 
ALTER COLUMN agent_id SET NOT NULL;

ALTER TABLE public.business_notification_preferences 
ALTER COLUMN agent_id SET NOT NULL;

-- ==========================================
-- 4. VERIFICATION QUERIES
-- ==========================================

-- Check calendar setup structure
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'business_calendar_setup' 
AND column_name IN ('firm_user_id', 'agent_id', 'calendar_name')
ORDER BY ordinal_position;

-- Check notification preferences structure  
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'business_notification_preferences' 
AND column_name IN ('firm_user_id', 'agent_id', 'email_enabled')
ORDER BY ordinal_position;

-- Check constraints
SELECT 
    tc.constraint_name, 
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN ('business_calendar_setup', 'business_notification_preferences')
AND tc.constraint_type = 'UNIQUE';