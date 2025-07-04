-- Modify existing squidgy_agent_business_setup table to support progressive setup
-- Run this in your Supabase SQL editor

-- Add new columns to existing table
ALTER TABLE public.squidgy_agent_business_setup 
ADD COLUMN IF NOT EXISTS session_id UUID NULL,
ADD COLUMN IF NOT EXISTS setup_type VARCHAR(50) NULL DEFAULT 'agent_config';

-- Update the primary key to include setup_type for multiple setup records per agent
-- First, we need to drop the existing primary key
ALTER TABLE public.squidgy_agent_business_setup DROP CONSTRAINT IF EXISTS squidgy_agent_business_setup_pkey;

-- Add a new id column as primary key
ALTER TABLE public.squidgy_agent_business_setup 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

-- Create new primary key on id
ALTER TABLE public.squidgy_agent_business_setup 
ADD CONSTRAINT squidgy_agent_business_setup_pkey PRIMARY KEY (id);

-- Create unique constraint for firm_user_id, agent_id, setup_type combination
ALTER TABLE public.squidgy_agent_business_setup 
ADD CONSTRAINT unique_user_agent_setup_type UNIQUE (firm_user_id, agent_id, setup_type);

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_agent_setup_session_id ON public.squidgy_agent_business_setup(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_setup_type ON public.squidgy_agent_business_setup(setup_type);
CREATE INDEX IF NOT EXISTS idx_agent_setup_user_type ON public.squidgy_agent_business_setup(firm_user_id, setup_type);
CREATE INDEX IF NOT EXISTS idx_agent_setup_agent_type ON public.squidgy_agent_business_setup(agent_id, setup_type);

-- Update existing records to have setup_type = 'agent_config' if they don't have one
UPDATE public.squidgy_agent_business_setup 
SET setup_type = 'agent_config' 
WHERE setup_type IS NULL;

-- Make setup_type NOT NULL now that all records have values
ALTER TABLE public.squidgy_agent_business_setup 
ALTER COLUMN setup_type SET NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.squidgy_agent_business_setup.setup_type IS 'Type of setup: agent_config, SolarSetup, CalendarSetup, NotificationSetup';
COMMENT ON COLUMN public.squidgy_agent_business_setup.session_id IS 'Chat session ID where the setup was completed';
COMMENT ON TABLE public.squidgy_agent_business_setup IS 'Unified table for all agent setup configurations including progressive setup stages';