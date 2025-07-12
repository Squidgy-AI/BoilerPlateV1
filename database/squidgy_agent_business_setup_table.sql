-- Complete table schema for squidgy_agent_business_setup
-- This table stores agent configurations and enabled status for each user

CREATE TABLE public.squidgy_agent_business_setup (
  firm_id uuid NULL,
  firm_user_id uuid NOT NULL,
  agent_id character varying(255) NOT NULL,
  agent_name character varying(255) NOT NULL,
  setup_json jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  is_enabled boolean NOT NULL DEFAULT false,
  CONSTRAINT squidgy_agent_business_setup_pkey PRIMARY KEY (firm_user_id, agent_id)
) TABLESPACE pg_default;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_public_agent_setup_firm_user 
ON public.squidgy_agent_business_setup USING btree (firm_user_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_public_agent_setup_agent 
ON public.squidgy_agent_business_setup USING btree (agent_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_public_agent_setup_json 
ON public.squidgy_agent_business_setup USING gin (setup_json) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_public_agent_setup_enabled 
ON public.squidgy_agent_business_setup USING btree (firm_user_id, is_enabled) 
TABLESPACE pg_default;

-- Comments for documentation
COMMENT ON TABLE public.squidgy_agent_business_setup IS 'Stores agent configurations and enabled status for each user';
COMMENT ON COLUMN public.squidgy_agent_business_setup.firm_user_id IS 'UUID of the user who owns this agent configuration';
COMMENT ON COLUMN public.squidgy_agent_business_setup.agent_id IS 'Unique identifier for the agent type (e.g., SOLAgent, PersonalAssistant)';
COMMENT ON COLUMN public.squidgy_agent_business_setup.agent_name IS 'Human-readable name of the agent';
COMMENT ON COLUMN public.squidgy_agent_business_setup.setup_json IS 'JSON configuration for agent-specific settings';
COMMENT ON COLUMN public.squidgy_agent_business_setup.is_enabled IS 'Whether this agent is enabled for the user (only enabled agents appear in UI)';

-- Key business logic:
-- 1. Only agents with is_enabled = true appear in the Agents tab
-- 2. PersonalAssistant is always enabled by default
-- 3. When user clicks "YES" to enable SOL Agent, is_enabled is updated to true
-- 4. The primary key (firm_user_id, agent_id) ensures one config per user per agent