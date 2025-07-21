-- Create business profiles table for storing business information with visual assets
-- This table links to profiles table and stores screenshots, favicons, and uploaded logos

CREATE TABLE IF NOT EXISTS public.business_profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    
    -- Business Information
    business_name text NOT NULL,
    business_email text NOT NULL,
    phone text,
    website text,
    address text,
    city text,
    state text,
    country text DEFAULT 'US',
    postal_code text,
    
    -- Visual Assets (URLs to Supabase Storage)
    logo_url text NULL,           -- User uploaded logo
    screenshot_url text NULL,     -- Website screenshot
    favicon_url text NULL,        -- Website favicon
    
    -- Asset Storage Paths (for cleanup if needed)
    logo_storage_path text NULL,
    screenshot_storage_path text NULL,
    favicon_storage_path text NULL,
    
    -- Metadata
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_profiles_firm_user_id 
ON public.business_profiles USING btree (firm_user_id);

CREATE INDEX IF NOT EXISTS idx_business_profiles_business_email 
ON public.business_profiles USING btree (business_email);

-- Create trigger to auto-update timestamp
CREATE OR REPLACE FUNCTION update_business_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_business_profiles_updated_at
    BEFORE UPDATE ON public.business_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_business_profiles_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.business_profiles IS 'Stores business information and visual assets for each user';
COMMENT ON COLUMN public.business_profiles.logo_url IS 'User uploaded business logo (Supabase Storage URL)';
COMMENT ON COLUMN public.business_profiles.screenshot_url IS 'Auto-captured website screenshot (Supabase Storage URL)';
COMMENT ON COLUMN public.business_profiles.favicon_url IS 'Auto-extracted website favicon (Supabase Storage URL)';