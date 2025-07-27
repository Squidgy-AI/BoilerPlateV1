-- SIMPLE APPROACH: Create all 3 tables when user signs up
-- Add email_confirmed column and create everything in the trigger

-- Add email_confirmed column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_confirmed BOOLEAN DEFAULT FALSE;

-- Create trigger that makes all 3 tables at signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    new_company_id UUID;
    new_session_id UUID;
BEGIN
    -- Generate UUIDs
    new_user_id := gen_random_uuid();
    new_company_id := gen_random_uuid();
    new_session_id := gen_random_uuid();
    
    -- 1. Create profile (email_confirmed = TRUE for auto-confirmation)
    INSERT INTO public.profiles (
        id, user_id, email, full_name, company_id, role, email_confirmed
    ) VALUES (
        NEW.id, new_user_id, NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        new_company_id, 'member', TRUE
    );
    
    -- 2. Create business_profile
    INSERT INTO public.business_profiles (
        firm_user_id, firm_id
    ) VALUES (
        new_user_id, new_company_id
    );
    
    -- 3. Create agent record
    INSERT INTO public.squidgy_agent_business_setup (
        firm_id, firm_user_id, agent_id, agent_name, 
        setup_type, setup_json, is_enabled, session_id
    ) VALUES (
        new_company_id, new_user_id, 'PersonalAssistant', 'Personal Assistant',
        'agent_config', '{"description": "Your general-purpose AI assistant", "capabilities": ["general_chat", "help", "information"]}',
        true, new_session_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();