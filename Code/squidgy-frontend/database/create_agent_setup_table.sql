-- Create a simplified table for agent business setup
-- This table doesn't use foreign key constraints to the complex business_user_info table

DROP TABLE IF EXISTS public.squidgy_agent_business_setup CASCADE;

CREATE TABLE public.squidgy_agent_business_setup (
    firm_id UUID NOT NULL,
    firm_user_id UUID NOT NULL,
    agent_id VARCHAR(255) NOT NULL, -- String identifier like 'SOLAgent'
    agent_name VARCHAR(255) NOT NULL,
    setup_json JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Composite primary key (one setup per firm_user and agent)
    PRIMARY KEY (firm_id, firm_user_id, agent_id)
);

-- Create indexes for better performance
CREATE INDEX idx_agent_business_setup_firm ON public.squidgy_agent_business_setup(firm_id);
CREATE INDEX idx_agent_business_setup_agent ON public.squidgy_agent_business_setup(agent_id);
CREATE INDEX idx_agent_business_setup_json ON public.squidgy_agent_business_setup USING GIN(setup_json);

-- Enable Row Level Security
ALTER TABLE public.squidgy_agent_business_setup ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow users to access their own data
CREATE POLICY agent_setup_user_policy ON public.squidgy_agent_business_setup
    FOR ALL USING (auth.uid() = firm_user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_agent_setup_updated_at 
    BEFORE UPDATE ON public.squidgy_agent_business_setup
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();