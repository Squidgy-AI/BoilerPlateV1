-- Add is_enabled column to existing squidgy_agent_business_setup table
-- This script handles the case where the table was already created without is_enabled

-- Add the is_enabled column if it doesn't exist
ALTER TABLE public.squidgy_agent_business_setup 
ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT false;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_public_agent_setup_enabled ON public.squidgy_agent_business_setup USING btree (firm_user_id, is_enabled) TABLESPACE pg_default;

-- Update existing records to set PersonalAssistant as enabled, others as disabled
UPDATE public.squidgy_agent_business_setup 
SET is_enabled = true 
WHERE agent_id = 'PersonalAssistant';

UPDATE public.squidgy_agent_business_setup 
SET is_enabled = false 
WHERE agent_id != 'PersonalAssistant';

-- Insert default agents for users who don't have them yet
INSERT INTO public.squidgy_agent_business_setup (firm_user_id, agent_id, agent_name, is_enabled, setup_json)
SELECT 
  p.user_id,
  'PersonalAssistant',
  'Personal Assistant Bot',
  true,
  '{}'::jsonb
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.squidgy_agent_business_setup s 
  WHERE s.firm_user_id = p.user_id AND s.agent_id = 'PersonalAssistant'
);

INSERT INTO public.squidgy_agent_business_setup (firm_user_id, agent_id, agent_name, is_enabled, setup_json)
SELECT 
  p.user_id,
  'SOLAgent',
  'Solar Sales Specialist',
  false,
  '{}'::jsonb
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.squidgy_agent_business_setup s 
  WHERE s.firm_user_id = p.user_id AND s.agent_id = 'SOLAgent'
);

-- Add comments for documentation
COMMENT ON TABLE public.squidgy_agent_business_setup IS 'Single source of truth for agent enablement and configuration per user';
COMMENT ON COLUMN public.squidgy_agent_business_setup.is_enabled IS 'Whether this agent is enabled for the user - controls visibility in agents tab';
COMMENT ON COLUMN public.squidgy_agent_business_setup.setup_json IS 'Agent-specific configuration data (solar parameters, etc.)';

-- Verify the setup
SELECT 
  firm_user_id,
  agent_id,
  agent_name,
  is_enabled,
  created_at
FROM public.squidgy_agent_business_setup
ORDER BY firm_user_id, agent_id;