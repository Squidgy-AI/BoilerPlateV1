-- Fix RLS policies for squidgy_agent_business_setup table
-- This will allow users to access their own agent setup data

-- Enable RLS on the table
ALTER TABLE public.squidgy_agent_business_setup ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own agent setups" ON public.squidgy_agent_business_setup;
DROP POLICY IF EXISTS "Users can insert their own agent setups" ON public.squidgy_agent_business_setup;
DROP POLICY IF EXISTS "Users can update their own agent setups" ON public.squidgy_agent_business_setup;
DROP POLICY IF EXISTS "Users can delete their own agent setups" ON public.squidgy_agent_business_setup;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view their own agent setups" 
ON public.squidgy_agent_business_setup 
FOR SELECT 
USING (auth.uid()::text = firm_user_id);

CREATE POLICY "Users can insert their own agent setups" 
ON public.squidgy_agent_business_setup 
FOR INSERT 
WITH CHECK (auth.uid()::text = firm_user_id);

CREATE POLICY "Users can update their own agent setups" 
ON public.squidgy_agent_business_setup 
FOR UPDATE 
USING (auth.uid()::text = firm_user_id)
WITH CHECK (auth.uid()::text = firm_user_id);

CREATE POLICY "Users can delete their own agent setups" 
ON public.squidgy_agent_business_setup 
FOR DELETE 
USING (auth.uid()::text = firm_user_id);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.squidgy_agent_business_setup TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;