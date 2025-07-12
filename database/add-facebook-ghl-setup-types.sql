-- Database migration for Facebook and GHL setup integration
-- This adds proper constraints and ensures consistency for the new setup types

-- 1. First, let's check the current setup_type values and add our new ones
-- Update the setup_type constraint to include our new setup types
ALTER TABLE public.squidgy_agent_business_setup 
DROP CONSTRAINT IF EXISTS chk_setup_type_values;

-- Add constraint to ensure only valid setup_type values
ALTER TABLE public.squidgy_agent_business_setup 
ADD CONSTRAINT chk_setup_type_values CHECK (
  setup_type IN (
    'agent_config', 
    'SolarSetup', 
    'CalendarSetup', 
    'NotificationSetup',
    'GHLSetup',           -- NEW: GoHighLevel account setup
    'FacebookIntegration' -- NEW: Facebook OAuth integration
  )
);

-- 2. Add indexes for the new setup types for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_setup_ghl 
ON public.squidgy_agent_business_setup(firm_user_id, agent_id) 
WHERE setup_type = 'GHLSetup';

CREATE INDEX IF NOT EXISTS idx_agent_setup_facebook 
ON public.squidgy_agent_business_setup(firm_user_id, agent_id) 
WHERE setup_type = 'FacebookIntegration';

-- 3. Add JSON schema validation for the new setup types
-- This ensures the setup_json column contains the expected structure

-- GHL Setup JSON should contain: location_id, user_id, location_name, user_name, user_email, setup_status
-- Facebook Setup JSON should contain: location_id, user_id, oauth_url, integration_status

-- Note: PostgreSQL doesn't have built-in JSON schema validation
-- In production, you might want to add CHECK constraints or use a JSON schema extension

-- 4. Add comments for the new setup types
COMMENT ON CONSTRAINT chk_setup_type_values ON public.squidgy_agent_business_setup IS 
'Validates setup_type values: agent_config (basic agent), SolarSetup (solar config), CalendarSetup (calendar config), NotificationSetup (notification prefs), GHLSetup (GoHighLevel account), FacebookIntegration (Facebook OAuth)';

-- 5. Create a view for easier querying of setup progress
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

-- 6. Example queries to verify the setup

-- Query to see all setup types for a user
-- SELECT firm_user_id, agent_id, setup_type, is_enabled, created_at 
-- FROM public.squidgy_agent_business_setup 
-- WHERE firm_user_id = 'your-user-id' 
-- ORDER BY created_at;

-- Query to see setup progress for all users
-- SELECT * FROM public.user_setup_progress 
-- ORDER BY firm_user_id;

-- Query to find users at specific setup stages
-- SELECT firm_user_id, next_step, overall_status 
-- FROM public.user_setup_progress 
-- WHERE next_step = 'ghl';

-- 7. Cleanup: Remove any orphaned records (optional, uncomment if needed)
-- DELETE FROM public.squidgy_agent_business_setup 
-- WHERE setup_type NOT IN ('agent_config', 'SolarSetup', 'CalendarSetup', 'NotificationSetup', 'GHLSetup', 'FacebookIntegration');

-- Success message
SELECT 'Database migration completed successfully! Added GHLSetup and FacebookIntegration setup types with proper constraints and indexes.' as status;