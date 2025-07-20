-- Migration: Add GHL location_id and user_id columns to tables
-- Run this script in your Supabase SQL editor

-- Step 1: Add GHL columns to squidgy_agent_business_setup table
ALTER TABLE public.squidgy_agent_business_setup 
ADD COLUMN IF NOT EXISTS ghl_location_id text NULL;

ALTER TABLE public.squidgy_agent_business_setup 
ADD COLUMN IF NOT EXISTS ghl_user_id text NULL;

-- Step 2: Add GHL columns to squidgy_facebook_pages table  
ALTER TABLE public.squidgy_facebook_pages 
ADD COLUMN IF NOT EXISTS ghl_location_id text NULL;

ALTER TABLE public.squidgy_facebook_pages 
ADD COLUMN IF NOT EXISTS ghl_user_id text NULL;

-- Step 3: Add indexes for better query performance
-- Indexes for squidgy_agent_business_setup
CREATE INDEX IF NOT EXISTS idx_agent_setup_ghl_location 
ON public.squidgy_agent_business_setup USING btree (ghl_location_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_agent_setup_ghl_user 
ON public.squidgy_agent_business_setup USING btree (ghl_user_id) 
TABLESPACE pg_default;

-- Composite index for GHL credentials lookup
CREATE INDEX IF NOT EXISTS idx_agent_setup_ghl_credentials 
ON public.squidgy_agent_business_setup USING btree (ghl_location_id, ghl_user_id) 
TABLESPACE pg_default;

-- Indexes for squidgy_facebook_pages
CREATE INDEX IF NOT EXISTS idx_facebook_pages_ghl_location 
ON public.squidgy_facebook_pages USING btree (ghl_location_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_facebook_pages_ghl_user 
ON public.squidgy_facebook_pages USING btree (ghl_user_id) 
TABLESPACE pg_default;

-- Step 4: Add documentation comments
COMMENT ON COLUMN public.squidgy_agent_business_setup.ghl_location_id IS 'GoHighLevel location ID obtained from GHL setup step, propagated to all subsequent setup records';
COMMENT ON COLUMN public.squidgy_agent_business_setup.ghl_user_id IS 'GoHighLevel user ID obtained from GHL setup step, propagated to all subsequent setup records';
COMMENT ON COLUMN public.squidgy_facebook_pages.ghl_location_id IS 'GoHighLevel location ID from the associated agent setup';
COMMENT ON COLUMN public.squidgy_facebook_pages.ghl_user_id IS 'GoHighLevel user ID from the associated agent setup';

-- Verification queries (run these to check the migration worked)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'squidgy_agent_business_setup' 
-- AND column_name LIKE '%ghl%';

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'squidgy_facebook_pages' 
-- AND column_name LIKE '%ghl%';