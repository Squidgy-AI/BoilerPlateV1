-- Fix 409 Conflict errors for Supabase API access
-- This ensures anonymous/public users can access the tables

-- Make sure RLS is completely disabled
ALTER TABLE public.squidgy_agent_business_setup DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DO $$ 
DECLARE 
    pol_name text;
BEGIN
    -- Drop all policies for squidgy_agent_business_setup
    FOR pol_name IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'squidgy_agent_business_setup'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.squidgy_agent_business_setup', pol_name);
    END LOOP;
    
    -- Drop all policies for chat_history
    FOR pol_name IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'chat_history'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_history', pol_name);
    END LOOP;
END $$;

-- Grant ALL permissions to ALL roles
GRANT ALL ON public.squidgy_agent_business_setup TO anon;
GRANT ALL ON public.squidgy_agent_business_setup TO authenticated;
GRANT ALL ON public.squidgy_agent_business_setup TO public;
GRANT ALL ON public.squidgy_agent_business_setup TO service_role;

GRANT ALL ON public.chat_history TO anon;
GRANT ALL ON public.chat_history TO authenticated;
GRANT ALL ON public.chat_history TO public;
GRANT ALL ON public.chat_history TO service_role;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant sequence permissions (for auto-increment IDs)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO public;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Verify the setup
SELECT 
    schemaname,
    tablename, 
    rowsecurity,
    (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public' 
AND tablename IN ('squidgy_agent_business_setup', 'chat_history');