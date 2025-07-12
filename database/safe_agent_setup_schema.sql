-- Safe schema update for squidgy_agent_business_setup
-- This will create the table if it doesn't exist, or add missing columns/indexes if it does

-- Create table only if it doesn't exist
CREATE TABLE IF NOT EXISTS public.squidgy_agent_business_setup (
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

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add is_enabled column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'squidgy_agent_business_setup' 
                   AND column_name = 'is_enabled') THEN
        ALTER TABLE public.squidgy_agent_business_setup 
        ADD COLUMN is_enabled boolean NOT NULL DEFAULT false;
    END IF;
    
    -- Add firm_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'squidgy_agent_business_setup' 
                   AND column_name = 'firm_id') THEN
        ALTER TABLE public.squidgy_agent_business_setup 
        ADD COLUMN firm_id uuid NULL;
    END IF;
END $$;

-- Create indexes (IF NOT EXISTS prevents errors if they already exist)
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

-- Add documentation comments
COMMENT ON TABLE public.squidgy_agent_business_setup IS 'Stores agent configurations and enabled status for each user';
COMMENT ON COLUMN public.squidgy_agent_business_setup.firm_user_id IS 'UUID of the user who owns this agent configuration';
COMMENT ON COLUMN public.squidgy_agent_business_setup.agent_id IS 'Unique identifier for the agent type (e.g., SOLAgent, PersonalAssistant)';
COMMENT ON COLUMN public.squidgy_agent_business_setup.agent_name IS 'Human-readable name of the agent';
COMMENT ON COLUMN public.squidgy_agent_business_setup.setup_json IS 'JSON configuration for agent-specific settings';
COMMENT ON COLUMN public.squidgy_agent_business_setup.is_enabled IS 'Whether this agent is enabled for the user (only enabled agents appear in UI)';

-- Verify the setup
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'squidgy_agent_business_setup'
ORDER BY ordinal_position;