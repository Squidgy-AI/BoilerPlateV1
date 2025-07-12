-- Create table for storing Facebook integration data
CREATE TABLE IF NOT EXISTS public.squidgy_business_fb_integration (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    firm_user_id UUID NOT NULL REFERENCES profiles(user_id),
    location_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    
    -- Facebook OAuth Data
    fb_access_token TEXT,
    fb_refresh_token TEXT,
    fb_token_expires_at TIMESTAMPTZ,
    
    -- Facebook Pages Data
    fb_pages_data JSONB, -- Array of all pages with details
    selected_page_id VARCHAR(255),
    selected_page_data JSONB,
    
    -- GHL Integration Status
    ghl_integration_status VARCHAR(50) DEFAULT 'pending', -- pending, connected, failed
    ghl_connection_data JSONB,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(firm_user_id, location_id)
);

-- Create index for faster lookups
CREATE INDEX idx_fb_integration_firm_user ON squidgy_business_fb_integration(firm_user_id);
CREATE INDEX idx_fb_integration_location ON squidgy_business_fb_integration(location_id);

-- Add RLS policies
ALTER TABLE squidgy_business_fb_integration ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own FB integration data
CREATE POLICY "Users can view own FB integration" ON squidgy_business_fb_integration
    FOR SELECT USING (firm_user_id = auth.uid());

-- Policy: Users can insert their own FB integration data
CREATE POLICY "Users can insert own FB integration" ON squidgy_business_fb_integration
    FOR INSERT WITH CHECK (firm_user_id = auth.uid());

-- Policy: Users can update their own FB integration data
CREATE POLICY "Users can update own FB integration" ON squidgy_business_fb_integration
    FOR UPDATE USING (firm_user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_fb_integration_updated_at
    BEFORE UPDATE ON squidgy_business_fb_integration
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();