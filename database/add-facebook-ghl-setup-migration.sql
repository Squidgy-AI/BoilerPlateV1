-- Database migration for Facebook and GHL setup integration
-- This updates the existing constraint to include the new setup types

-- 1. Drop the existing constraint and add the updated one with new setup types
ALTER TABLE public.squidgy_agent_business_setup 
DROP CONSTRAINT IF EXISTS valid_setup_types;

-- Add updated constraint to include our new setup types
ALTER TABLE public.squidgy_agent_business_setup 
ADD CONSTRAINT valid_setup_types CHECK (
  (setup_type)::text = ANY (
    (ARRAY[
      'agent_config'::character varying,
      'SolarSetup'::character varying,
      'CalendarSetup'::character varying,
      'NotificationSetup'::character varying,
      'GHLSetup'::character varying,           -- NEW: GoHighLevel account setup
      'FacebookIntegration'::character varying -- NEW: Facebook OAuth integration
    ])::text[]
  )
);

-- 2. Add specialized indexes for the new setup types for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_setup_ghl 
ON public.squidgy_agent_business_setup(firm_user_id, agent_id) 
WHERE setup_type = 'GHLSetup';

CREATE INDEX IF NOT EXISTS idx_agent_setup_facebook 
ON public.squidgy_agent_business_setup(firm_user_id, agent_id) 
WHERE setup_type = 'FacebookIntegration';

-- 3. Add comment for the updated constraint
COMMENT ON CONSTRAINT valid_setup_types ON public.squidgy_agent_business_setup IS 
'Validates setup_type values: agent_config (basic agent), SolarSetup (solar config), CalendarSetup (calendar config), NotificationSetup (notification prefs), GHLSetup (GoHighLevel account), FacebookIntegration (Facebook OAuth)';

-- 4. Create a view for easier querying of setup progress
CREATE OR REPLACE VIEW public.user_setup_progress AS
SELECT 
  firm_user_id,
  agent_id,
  agent_name,
  -- Setup completion flags
  BOOL_OR(CASE WHEN setup_type = 'SolarSetup' AND is_enabled = true THEN true ELSE false END) as solar_completed,
  BOOL_OR(CASE WHEN setup_type = 'CalendarSetup' AND is_enabled = true THEN true ELSE false END) as calendar_completed,
  BOOL_OR(CASE WHEN setup_type = 'NotificationSetup' AND is_enabled = true THEN true ELSE false END) as notifications_completed,
  BOOL_OR(CASE WHEN setup_type = 'GHLSetup' AND is_enabled = true THEN true ELSE false END) as ghl_completed,
  BOOL_OR(CASE WHEN setup_type = 'FacebookIntegration' AND is_enabled = true THEN true ELSE false END) as facebook_completed,
  -- Completion timestamps
  MAX(CASE WHEN setup_type = 'SolarSetup' AND is_enabled = true THEN created_at END) as solar_completed_at,
  MAX(CASE WHEN setup_type = 'CalendarSetup' AND is_enabled = true THEN created_at END) as calendar_completed_at,
  MAX(CASE WHEN setup_type = 'NotificationSetup' AND is_enabled = true THEN created_at END) as notifications_completed_at,
  MAX(CASE WHEN setup_type = 'GHLSetup' AND is_enabled = true THEN created_at END) as ghl_completed_at,
  MAX(CASE WHEN setup_type = 'FacebookIntegration' AND is_enabled = true THEN created_at END) as facebook_completed_at,
  -- Overall completion status
  CASE 
    WHEN COUNT(CASE WHEN setup_type IN ('SolarSetup', 'CalendarSetup', 'NotificationSetup', 'GHLSetup', 'FacebookIntegration') AND is_enabled = true THEN 1 END) = 5 
    THEN 'complete'
    ELSE 'in_progress'
  END as overall_status,
  -- Next required step
  CASE 
    WHEN NOT BOOL_OR(CASE WHEN setup_type = 'SolarSetup' AND is_enabled = true THEN true ELSE false END) THEN 'solar'
    WHEN NOT BOOL_OR(CASE WHEN setup_type = 'CalendarSetup' AND is_enabled = true THEN true ELSE false END) THEN 'calendar'
    WHEN NOT BOOL_OR(CASE WHEN setup_type = 'NotificationSetup' AND is_enabled = true THEN true ELSE false END) THEN 'notifications'
    WHEN NOT BOOL_OR(CASE WHEN setup_type = 'GHLSetup' AND is_enabled = true THEN true ELSE false END) THEN 'ghl'
    WHEN NOT BOOL_OR(CASE WHEN setup_type = 'FacebookIntegration' AND is_enabled = true THEN true ELSE false END) THEN 'facebook'
    ELSE 'complete'
  END as next_step
FROM public.squidgy_agent_business_setup
WHERE agent_id = 'SOLAgent'
GROUP BY firm_user_id, agent_id, agent_name;

-- Add comment for the view
COMMENT ON VIEW public.user_setup_progress IS 'Consolidated view of setup progress for each user, showing completion status of all 5 setup steps';

-- 5. Verification queries
SELECT 'Database migration completed successfully! Added GHLSetup and FacebookIntegration setup types.' as status;

-- Test the constraint works
SELECT 'Testing constraint...' as test_status;

-- Show current setup types in the database
SELECT DISTINCT setup_type, COUNT(*) as count
FROM public.squidgy_agent_business_setup 
GROUP BY setup_type 
ORDER BY setup_type;