-- Drop existing tables and their dependencies
DROP TABLE IF EXISTS sq_business_data.business_avatars CASCADE;
DROP TABLE IF EXISTS sq_business_data.business_user_info CASCADE;

-- Drop the trigger function if no other tables use it
DROP FUNCTION IF EXISTS sq_business_data.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS sq_business_data.check_firm_id_match() CASCADE;

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS sq_business_data;

-- Create the business_user_info table with firm_id included
CREATE TABLE sq_business_data.business_user_info (
    firm_user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL,
    session_id UUID,
    firm_user_name VARCHAR(255) UNIQUE NOT NULL,
    firm_user_first_name VARCHAR(100),
    firm_user_last_name VARCHAR(100),
    firm_user_middle_name VARCHAR(100),
    firm_user_full_name VARCHAR(305) GENERATED ALWAYS AS (
        TRIM(
            COALESCE(firm_user_first_name, '') || ' ' || 
            COALESCE(firm_user_middle_name, '') || ' ' || 
            COALESCE(firm_user_last_name, '')
        )
    ) STORED,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password VARCHAR(255),
    hashedpassword VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for business_user_info
CREATE INDEX idx_business_user_email ON sq_business_data.business_user_info(email);
CREATE INDEX idx_business_user_name ON sq_business_data.business_user_info(firm_user_name);
CREATE INDEX idx_business_user_firm_id ON sq_business_data.business_user_info(firm_id);

-- Create the business_avatars table
CREATE TABLE sq_business_data.business_avatars (
    avatar_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_user_id UUID NOT NULL,
    firm_id UUID NOT NULL,
    avatar_name VARCHAR(255) NOT NULL,
    avatar_description TEXT,
    heygenAvatarId VARCHAR(255),
    fallbackAvatarimage TEXT,
    introMessage TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_business_avatars_user 
        FOREIGN KEY (firm_user_id) 
        REFERENCES sq_business_data.business_user_info(firm_user_id) 
        ON DELETE CASCADE
);

-- Create indexes for business_avatars
CREATE INDEX idx_business_avatars_firm_user_id ON sq_business_data.business_avatars(firm_user_id);
CREATE INDEX idx_business_avatars_firm_id ON sq_business_data.business_avatars(firm_id);
CREATE INDEX idx_business_avatars_heygen_id ON sq_business_data.business_avatars(heygenAvatarId);

-- Create unique constraint for avatar names per firm
CREATE UNIQUE INDEX idx_unique_avatar_name_per_firm 
    ON sq_business_data.business_avatars(firm_id, avatar_name);


CREATE TABLE sq_business_data.squidgy_agent (
    agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(255) UNIQUE NOT NULL,
    avatar_description TEXT,
    heygenAvatarId VARCHAR(255),
    fallbackAvatarimage TEXT,
    introMessage TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sq_business_data.business_login_type (
    firm_user_id UUID NOT NULL,
    firm_id UUID NOT NULL,
    login_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Composite primary key (one login type per user)
    PRIMARY KEY (firm_user_id),
    
    -- Foreign key constraint
    CONSTRAINT fk_business_login_type_user 
        FOREIGN KEY (firm_user_id) 
        REFERENCES sq_business_data.business_user_info(firm_user_id) 
        ON DELETE CASCADE
        
    -- Check constraint for valid login types
    -- CONSTRAINT check_valid_login_type 
    --     CHECK (login_type IN ('email', 'google', 'microsoft', 'saml', 'oauth', 'magic_link'))
);

-- Create indexes
CREATE INDEX idx_business_login_type_firm_id ON sq_business_data.business_login_type(firm_id);
CREATE INDEX idx_business_login_type_type ON sq_business_data.business_login_type(login_type);




CREATE EXTENSION IF NOT EXISTS vector;

-- Add the new columns to the existing squidgy_agent table
ALTER TABLE sq_business_data.squidgy_agent 
ADD COLUMN agent_kb TEXT,
ADD COLUMN content TEXT,
ADD COLUMN metadata JSONB DEFAULT '{}',
ADD COLUMN embeddings vector(1536);

-- Create indexes for the new columns
CREATE INDEX idx_squidgy_agent_metadata ON sq_business_data.squidgy_agent USING GIN(metadata);

-- Create vector similarity search index
CREATE INDEX idx_squidgy_agent_embeddings ON sq_business_data.squidgy_agent 
    USING ivfflat (embeddings vector_cosine_ops)
    WITH (lists = 100);


CREATE TABLE sq_business_data.business_website_info (
    firm_id UUID NOT NULL,
    firm_user_id UUID NOT NULL,
    session_id UUID NOT NULL,
    info_json JSONB NOT NULL,
    url TEXT,
    firm_user_message TEXT,
    analysis TEXT,
    screenshot_url TEXT,
    favicon_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Primary key on session_id
    PRIMARY KEY (session_id),
    
    -- Foreign key constraint
    CONSTRAINT fk_business_website_info_user 
        FOREIGN KEY (firm_user_id) 
        REFERENCES sq_business_data.business_user_info(firm_user_id) 
        ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_business_website_info_firm_user ON sq_business_data.business_website_info(firm_id, firm_user_id);
CREATE INDEX idx_business_website_info_created ON sq_business_data.business_website_info(created_at DESC);
CREATE INDEX idx_business_website_info_json ON sq_business_data.business_website_info USING GIN(info_json);



-- -- 1. Add URL column to existing table
-- ALTER TABLE sq_business_data.business_website_info 
-- ADD COLUMN url TEXT;

-- 2. Create index on URL
CREATE INDEX idx_business_website_info_url ON sq_business_data.business_website_info(url);

-- 3. Create the view with structured columns
DROP VIEW IF EXISTS sq_business_data.business_website_info_unnested;

CREATE OR REPLACE VIEW sq_business_data.business_website_info_unnested AS
SELECT 
    bwi.firm_id,
    bwi.firm_user_id,
    bwi.session_id,
    bwi.firm_user_message,
    bwi.analysis,
    bwi.screenshot_url,
    bwi.favicon_url,
    bwi.url,
    bwi.created_at,
    bwi.updated_at,
    -- Extract from info_json first, then try to parse from analysis if it's JSON
    COALESCE(
        info_json->>'company_name',
        CASE 
            WHEN bwi.analysis::json->>'company_name' IS NOT NULL 
            THEN bwi.analysis::json->>'company_name'
            ELSE ''
        END
    ) as company_name,
    COALESCE(
        info_json->>'website',
        info_json->>'url',
        CASE 
            WHEN bwi.analysis::json->>'website' IS NOT NULL 
            THEN bwi.analysis::json->>'website'
            ELSE bwi.url
        END
    ) as website,
    COALESCE(
        info_json->>'contact_information',
        CASE 
            WHEN bwi.analysis::json->>'contact_information' IS NOT NULL 
            THEN bwi.analysis::json->>'contact_information'
            ELSE ''
        END
    ) as contact_information,
    COALESCE(
        info_json->>'description',
        CASE 
            WHEN bwi.analysis::json->>'description' IS NOT NULL 
            THEN bwi.analysis::json->>'description'
            ELSE ''
        END
    ) as description,
    COALESCE(
        info_json->>'tags',
        CASE 
            WHEN bwi.analysis::json->>'tags' IS NOT NULL 
            THEN bwi.analysis::json->>'tags'
            ELSE ''
        END
    ) as tags,
    COALESCE(
        info_json->>'key_takeaways',
        CASE 
            WHEN bwi.analysis::json->>'key_takeaways' IS NOT NULL 
            THEN bwi.analysis::json->>'key_takeaways'
            ELSE ''
        END
    ) as key_takeaways,
    COALESCE(
        info_json->>'niche',
        CASE 
            WHEN bwi.analysis::json->>'niche' IS NOT NULL 
            THEN bwi.analysis::json->>'niche'
            ELSE ''
        END
    ) as niche,
    info_json as full_json
FROM sq_business_data.business_website_info bwi;

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_website_info_latest 
ON sq_business_data.business_website_info(firm_id, firm_user_id, created_at DESC);

-- 5. Create helper function to get previous analysis
CREATE OR REPLACE FUNCTION sq_business_data.get_previous_analysis(
    p_firm_id UUID,
    p_firm_user_id UUID
)
RETURNS TEXT AS $$
DECLARE
    v_analysis TEXT;
BEGIN
    SELECT analysis INTO v_analysis
    FROM sq_business_data.business_website_info
    WHERE firm_id = p_firm_id 
    AND firm_user_id = p_firm_user_id
    AND analysis IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN v_analysis;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE sq_business_data.squidgy_tools (
    tool_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_name VARCHAR(255) UNIQUE NOT NULL,
    tool_description TEXT,
    tool_input JSONB DEFAULT '{}',
    tool_output JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_squidgy_tools_name ON sq_business_data.squidgy_tools(tool_name);
CREATE INDEX idx_squidgy_tools_input ON sq_business_data.squidgy_tools USING GIN(tool_input);
CREATE INDEX idx_squidgy_tools_output ON sq_business_data.squidgy_tools USING GIN(tool_output);

-- -- 6. Enable RLS
-- ALTER TABLE sq_business_data.business_website_info ENABLE ROW LEVEL SECURITY;



-- Create the squidgy_api_credentials table
CREATE TABLE sq_business_data.squidgy_api_credentials (
    cred_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cred_name VARCHAR(255) UNIQUE NOT NULL,
    cred_type VARCHAR(100) NOT NULL,
    cred_value TEXT NOT NULL, -- Encrypted in production
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Add constraint for valid credential types
    -- CONSTRAINT check_valid_cred_type 
    --     CHECK (cred_type IN ('api_key', 'oauth', 'basic_auth', 'bearer_token', 'custom'))
);

-- Create indexes
CREATE INDEX idx_squidgy_api_credentials_name ON sq_business_data.squidgy_api_credentials(cred_name);
CREATE INDEX idx_squidgy_api_credentials_type ON sq_business_data.squidgy_api_credentials(cred_type);

-- Apply the existing update trigger
CREATE TRIGGER update_squidgy_api_credentials_updated_at 
    BEFORE UPDATE ON sq_business_data.squidgy_api_credentials
    FOR EACH ROW
    EXECUTE FUNCTION sq_business_data.update_updated_at_column();

-- Enable Row Level Security (IMPORTANT for credentials!)
ALTER TABLE sq_business_data.squidgy_api_credentials ENABLE ROW LEVEL SECURITY;

-- Create a strict RLS policy - adjust based on your needs
CREATE POLICY squidgy_api_credentials_admin_only ON sq_business_data.squidgy_api_credentials
    FOR ALL
    USING (auth.jwt()->>'role' = 'admin');






-- Example inserts (DO NOT store real credentials unencrypted!)
/*
INSERT INTO sq_business_data.squidgy_api_credentials (
    cred_name,
    cred_type,
    cred_value
) VALUES 
    ('openai_api_key', 'api_key', 'encrypted_value_here'),
    ('perplexity_api_key', 'api_key', 'encrypted_value_here'),
    ('google_oauth', 'oauth', '{"client_id": "...", "client_secret": "..."}'),
    ('slack_webhook', 'bearer_token', 'encrypted_token_here');
*/








-- async function analyzeAndStoreWebsite(data) {
--   const {
--     firm_id,
--     firm_user_id,
--     session_id,
--     url,
--     info_json,
--     firm_user_message,
--     screenshot_url,
--     favicon_url
--   } = data;

--   try {
--     // 1. Get previous analysis if exists
--     const { data: previousData } = await supabase
--       .rpc('get_previous_analysis', {
--         p_firm_id: firm_id,
--         p_firm_user_id: firm_user_id
--       });

--     // 2. Call GPT-4 for analysis
--     const prompt = `Please analyze the website ${url} and return the output in the following structured format:
-- - Company Name: [Extract the company name]  
-- - Website: ${url}  
-- - Contact Information: [List any available contact details such as email, phone number, or address]  
-- - Description: [Provide a 2–3 sentence summary of what the company does]  
-- - Tags: [Main business categories, separated by periods — e.g., Fintech. AI. E-commerce]  
-- - Key Takeaways: [Summarize the core value propositions or unique selling points]  
-- - Niche: [Specify the company's specific market focus or industry segment]

-- Additional data: ${JSON.stringify(info_json)}
-- ${previousData ? `\n\nPrevious analysis: ${previousData}` : ''}
-- ${firm_user_message ? `\n\nUser feedback: ${firm_user_message}` : ''}`;

--     const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
--       method: 'POST',
--       headers: {
--         'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
--         'Content-Type': 'application/json',
--       },
--       body: JSON.stringify({
--         model: 'gpt-4',
--         messages: [
--           {
--             role: 'system',
--             content: 'You are a website analyst. Provide structured analysis in the exact format requested.'
--           },
--           {
--             role: 'user',
--             content: prompt
--           }
--         ],
--         temperature: 0.7,
--         max_tokens: 1000
--       })
--     });

--     const gptData = await gptResponse.json();
--     const analysis = gptData.choices[0].message.content;

--     // 3. Insert complete record with analysis
--     const { data: result, error } = await supabase
--       .from('business_website_info')
--       .insert({
--         firm_id,
--         firm_user_id,
--         session_id: session_id || crypto.randomUUID(),
--         url,
--         info_json,
--         firm_user_message,
--         analysis,
--         screenshot_url,
--         favicon_url
--       })
--       .select()
--       .single();

--     if (error) throw error;

--     return { success: true, data: result };

--   } catch (error) {
--     console.error('Error analyzing website:', error);
    
--     // Insert without analysis on error
--     const { data: result, error: dbError } = await supabase
--       .from('business_website_info')
--       .insert({
--         firm_id,
--         firm_user_id,
--         session_id: session_id || crypto.randomUUID(),
--         url,
--         info_json,
--         firm_user_message,
--         analysis: 'Analysis failed - please retry',
--         screenshot_url,
--         favicon_url
--       })
--       .select()
--       .single();

--     return { 
--       success: false, 
--       data: result, 
--       error: error.message 
--     };
--   }
-- }

-- // Usage example
-- const result = await analyzeAndStoreWebsite({
--   firm_id: 'your-firm-uuid',
--   firm_user_id: 'your-user-uuid',
--   url: 'https://example.com',
--   info_json: {
--     company_name: 'Example Corp',
--     // ... other data
--   },
--   firm_user_message: 'Please update the analysis',
--   screenshot_url: 'https://...',
--   favicon_url: 'https://...'
-- });


CREATE TABLE sq_business_data.squidgy_agent_business_setup (
    firm_id UUID NOT NULL,
    firm_user_id UUID NOT NULL,
    agent_id UUID NOT NULL,
    agent_name VARCHAR(255) NOT NULL,
    setup_json JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Composite primary key (one setup per firm_user and agent)
    PRIMARY KEY (firm_id, firm_user_id, agent_id),
    
    -- Foreign key constraints
    CONSTRAINT fk_agent_business_setup_user 
        FOREIGN KEY (firm_user_id) 
        REFERENCES sq_business_data.business_user_info(firm_user_id) 
        ON DELETE CASCADE,
        
    CONSTRAINT fk_agent_business_setup_agent 
        FOREIGN KEY (agent_id) 
        REFERENCES sq_business_data.squidgy_agent(agent_id) 
        ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_agent_business_setup_firm ON sq_business_data.squidgy_agent_business_setup(firm_id);
CREATE INDEX idx_agent_business_setup_agent ON sq_business_data.squidgy_agent_business_setup(agent_id);
CREATE INDEX idx_agent_business_setup_json ON sq_business_data.squidgy_agent_business_setup USING GIN(setup_json);




 -- Grant usage on the schema
  GRANT USAGE ON SCHEMA sq_business_data TO anon, authenticated;

  -- Grant select, insert, update, delete on all tables in the schema
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA sq_business_data TO
  anon, authenticated;

  -- Grant access to future tables (if any are created later)
  ALTER DEFAULT PRIVILEGES IN SCHEMA sq_business_data GRANT SELECT, INSERT, UPDATE,
  DELETE ON TABLES TO anon, authenticated;

  -- Enable RLS on the specific table
  ALTER TABLE sq_business_data.squidgy_agent_business_setup ENABLE ROW LEVEL
  SECURITY;

  -- Create a policy to allow authenticated users to access their own records
  CREATE POLICY "Users can manage their own solar configs" ON
  sq_business_data.squidgy_agent_business_setup
    FOR ALL USING (auth.uid() = firm_user_id);
