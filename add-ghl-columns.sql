-- Add GHL location_id and user_id columns to squidgy_agent_business_setup table
-- These will store the GHL credentials for all setup records

ALTER TABLE public.squidgy_agent_business_setup 
ADD COLUMN IF NOT EXISTS ghl_location_id text NULL;

ALTER TABLE public.squidgy_agent_business_setup 
ADD COLUMN IF NOT EXISTS ghl_user_id text NULL;

-- Add indexes for the new GHL columns for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_setup_ghl_location 
ON public.squidgy_agent_business_setup USING btree (ghl_location_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_agent_setup_ghl_user 
ON public.squidgy_agent_business_setup USING btree (ghl_user_id) 
TABLESPACE pg_default;

-- Add composite index for GHL credentials
CREATE INDEX IF NOT EXISTS idx_agent_setup_ghl_credentials 
ON public.squidgy_agent_business_setup USING btree (ghl_location_id, ghl_user_id) 
TABLESPACE pg_default;

-- Update the squidgy_facebook_pages table to ensure it has the firm_user_id column
-- and add GHL credentials columns for consistency
ALTER TABLE public.squidgy_facebook_pages 
ADD COLUMN IF NOT EXISTS ghl_location_id text NULL;

ALTER TABLE public.squidgy_facebook_pages 
ADD COLUMN IF NOT EXISTS ghl_user_id text NULL;

-- Add indexes for Facebook pages GHL columns
CREATE INDEX IF NOT EXISTS idx_facebook_pages_ghl_location 
ON public.squidgy_facebook_pages USING btree (ghl_location_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_facebook_pages_ghl_user 
ON public.squidgy_facebook_pages USING btree (ghl_user_id) 
TABLESPACE pg_default;

-- Add comments to document the purpose of these columns
COMMENT ON COLUMN public.squidgy_agent_business_setup.ghl_location_id IS 'GoHighLevel location ID obtained from GHL setup step, propagated to all subsequent setup records';
COMMENT ON COLUMN public.squidgy_agent_business_setup.ghl_user_id IS 'GoHighLevel user ID obtained from GHL setup step, propagated to all subsequent setup records';
COMMENT ON COLUMN public.squidgy_facebook_pages.ghl_location_id IS 'GoHighLevel location ID from the associated agent setup';
COMMENT ON COLUMN public.squidgy_facebook_pages.ghl_user_id IS 'GoHighLevel user ID from the associated agent setup';