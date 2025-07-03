-- Temporarily disable ALL RLS policies for development
-- This allows public/anonymous access to all tables

-- Disable RLS on all relevant tables
ALTER TABLE public.squidgy_agent_business_setup DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ids DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their own agent setups" ON public.squidgy_agent_business_setup;
DROP POLICY IF EXISTS "Users can insert their own agent setups" ON public.squidgy_agent_business_setup;
DROP POLICY IF EXISTS "Users can update their own agent setups" ON public.squidgy_agent_business_setup;
DROP POLICY IF EXISTS "Users can delete their own agent setups" ON public.squidgy_agent_business_setup;

DROP POLICY IF EXISTS "Users can view their own chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Users can insert their own chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Users can update their own chat history" ON public.chat_history;
DROP POLICY IF EXISTS "Users can delete their own chat history" ON public.chat_history;

-- Grant full access to public/anon users
GRANT ALL ON public.squidgy_agent_business_setup TO anon;
GRANT ALL ON public.squidgy_agent_business_setup TO public;
GRANT ALL ON public.chat_history TO anon;
GRANT ALL ON public.chat_history TO public;
GRANT ALL ON public.user_ids TO anon;
GRANT ALL ON public.user_ids TO public;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO public;