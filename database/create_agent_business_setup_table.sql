-- Create the squidgy_agent_business_setup table as single source of truth for agent enablement
CREATE TABLE IF NOT EXISTS public.squidgy_agent_business_setup (
  firm_id uuid null,
  firm_user_id uuid not null,
  agent_id character varying(255) not null,
  agent_name character varying(255) not null,
  setup_json jsonb null default '{}'::jsonb,
  is_enabled boolean not null default false,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint squidgy_agent_business_setup_pkey primary key (firm_user_id, agent_id)
) TABLESPACE pg_default;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_public_agent_setup_firm_user ON public.squidgy_agent_business_setup USING btree (firm_user_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_public_agent_setup_agent ON public.squidgy_agent_business_setup USING btree (agent_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_public_agent_setup_json ON public.squidgy_agent_business_setup USING gin (setup_json) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_public_agent_setup_enabled ON public.squidgy_agent_business_setup USING btree (firm_user_id, is_enabled) TABLESPACE pg_default;

-- Insert default agents for existing users (PersonalAssistant enabled by default, SOLAgent disabled)
INSERT INTO public.squidgy_agent_business_setup (firm_user_id, agent_id, agent_name, is_enabled, setup_json)
SELECT 
  p.user_id,
  'PersonalAssistant',
  'Personal Assistant Bot',
  true,
  '{}'::jsonb
FROM public.profiles p
ON CONFLICT (firm_user_id, agent_id) DO NOTHING;

INSERT INTO public.squidgy_agent_business_setup (firm_user_id, agent_id, agent_name, is_enabled, setup_json)
SELECT 
  p.user_id,
  'SOLAgent',
  'Solar Sales Specialist',
  false,
  '{}'::jsonb
FROM public.profiles p
ON CONFLICT (firm_user_id, agent_id) DO NOTHING;

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