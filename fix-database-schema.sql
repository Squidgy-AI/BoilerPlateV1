-- Fix database schema for squidgy_agent_business_setup table
-- Add missing columns: setup_type and session_id

-- Add setup_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'squidgy_agent_business_setup' 
                   AND column_name = 'setup_type') THEN
        ALTER TABLE public.squidgy_agent_business_setup 
        ADD COLUMN setup_type character varying(255) NULL;
        
        RAISE NOTICE 'Added setup_type column';
    ELSE
        RAISE NOTICE 'setup_type column already exists';
    END IF;
END $$;

-- Add session_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'squidgy_agent_business_setup' 
                   AND column_name = 'session_id') THEN
        ALTER TABLE public.squidgy_agent_business_setup 
        ADD COLUMN session_id character varying(255) NULL;
        
        RAISE NOTICE 'Added session_id column';
    ELSE
        RAISE NOTICE 'session_id column already exists';
    END IF;
END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_agent_setup_setup_type 
ON public.squidgy_agent_business_setup USING btree (setup_type);

CREATE INDEX IF NOT EXISTS idx_agent_setup_session_id 
ON public.squidgy_agent_business_setup USING btree (session_id);

-- Add comments for the new columns
COMMENT ON COLUMN public.squidgy_agent_business_setup.setup_type IS 'Type of setup: agent_config, GHLSetup, FacebookIntegration, etc.';
COMMENT ON COLUMN public.squidgy_agent_business_setup.session_id IS 'Session ID for tracking setup flow';

-- Update the primary key to include setup_type (if needed)
-- This allows multiple setup types per agent per user
DO $$
BEGIN
    -- Check if we need to update the primary key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'squidgy_agent_business_setup' 
        AND tc.constraint_type = 'PRIMARY KEY'
        AND kcu.column_name = 'setup_type'
    ) THEN
        -- Drop existing primary key
        ALTER TABLE public.squidgy_agent_business_setup 
        DROP CONSTRAINT IF EXISTS squidgy_agent_business_setup_pkey;
        
        -- Add new composite primary key
        ALTER TABLE public.squidgy_agent_business_setup 
        ADD CONSTRAINT squidgy_agent_business_setup_pkey 
        PRIMARY KEY (firm_user_id, agent_id, setup_type);
        
        RAISE NOTICE 'Updated primary key to include setup_type';
    ELSE
        RAISE NOTICE 'Primary key already includes setup_type';
    END IF;
END $$;

-- Verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'squidgy_agent_business_setup'
ORDER BY ordinal_position;

-- Show current constraints
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'squidgy_agent_business_setup'
ORDER BY tc.constraint_type, kcu.ordinal_position;