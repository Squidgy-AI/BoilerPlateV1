-- Setup Row Level Security and permissions for squidgy_agent_business_setup table

-- Enable RLS on the table
ALTER TABLE public.squidgy_agent_business_setup ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see their own agent records
CREATE POLICY "Users can view their own agent setups" ON public.squidgy_agent_business_setup
    FOR SELECT USING (firm_user_id = (
        SELECT user_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Create policy to allow users to insert their own agent records
CREATE POLICY "Users can insert their own agent setups" ON public.squidgy_agent_business_setup
    FOR INSERT WITH CHECK (firm_user_id = (
        SELECT user_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Create policy to allow users to update their own agent records
CREATE POLICY "Users can update their own agent setups" ON public.squidgy_agent_business_setup
    FOR UPDATE USING (firm_user_id = (
        SELECT user_id FROM public.profiles WHERE id = auth.uid()
    )) WITH CHECK (firm_user_id = (
        SELECT user_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Create policy to allow users to delete their own agent records
CREATE POLICY "Users can delete their own agent setups" ON public.squidgy_agent_business_setup
    FOR DELETE USING (firm_user_id = (
        SELECT user_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.squidgy_agent_business_setup TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Test the permissions by selecting for current user
SELECT 
    'Permission Test' as test_name,
    COUNT(*) as record_count,
    CASE 
        WHEN COUNT(*) > 0 THEN 'PASS - Can read agent records'
        ELSE 'INFO - No agent records found (this is normal for new users)'
    END as status
FROM public.squidgy_agent_business_setup 
WHERE firm_user_id = (
    SELECT user_id FROM public.profiles WHERE id = auth.uid()
);

-- Show all policies on the table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'squidgy_agent_business_setup';

-- Verify table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'squidgy_agent_business_setup'
ORDER BY ordinal_position;