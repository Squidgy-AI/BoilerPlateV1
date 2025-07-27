-- CREATE ALL MISSING RECORDS FOR THE CONFIRMED USER
-- This will manually create what the trigger and confirmation page should have done

-- Get the auth user ID first
DO $$
DECLARE
    auth_user_id UUID;
    new_user_id UUID;
    new_company_id UUID;
    new_session_id UUID;
BEGIN
    -- Get the auth user ID
    SELECT id INTO auth_user_id 
    FROM auth.users 
    WHERE email = 'somasekhar.addakula@gmail.com';
    
    IF auth_user_id IS NULL THEN
        RAISE EXCEPTION 'Auth user not found for email: somasekhar.addakula@gmail.com';
    END IF;
    
    -- Generate UUIDs
    new_user_id := gen_random_uuid();
    new_company_id := gen_random_uuid();
    new_session_id := gen_random_uuid();
    
    -- 1. Create profile record (what the trigger should have done)
    INSERT INTO public.profiles (
        id,
        user_id,
        email,
        full_name,
        profile_avatar_url,
        company_id,
        role
    ) VALUES (
        auth_user_id,                    -- Use auth.users.id
        new_user_id,                     -- Generate new user_id
        'somasekhar.addakula@gmail.com', -- Email
        'SOMASEKHAR G ADDAKULA',         -- Full name from signup
        NULL,                            -- No avatar
        new_company_id,                  -- Generate company_id
        'member'                         -- Default role
    )
    ON CONFLICT (id) DO NOTHING;        -- Don't fail if already exists
    
    -- 2. Create business_profiles record (what confirmation page should have done)
    INSERT INTO public.business_profiles (
        firm_user_id,
        firm_id
    ) VALUES (
        new_user_id,        -- profiles.user_id
        new_company_id      -- profiles.company_id
    )
    ON CONFLICT (firm_user_id) DO NOTHING;
    
    -- 3. Create squidgy_agent_business_setup record (what confirmation page should have done)
    INSERT INTO public.squidgy_agent_business_setup (
        firm_id,
        firm_user_id,
        agent_id,
        agent_name,
        setup_type,
        setup_json,
        is_enabled,
        session_id
    ) VALUES (
        new_company_id,     -- profiles.company_id
        new_user_id,        -- profiles.user_id
        'PersonalAssistant',
        'Personal Assistant',
        'agent_config',
        '{"description": "Your general-purpose AI assistant", "capabilities": ["general_chat", "help", "information"]}'::jsonb,
        true,
        new_session_id
    )
    ON CONFLICT (firm_user_id, agent_id, setup_type) DO NOTHING;
    
    -- Output the created IDs
    RAISE NOTICE 'Records created for user: %', auth_user_id;
    RAISE NOTICE 'Profile user_id: %', new_user_id;
    RAISE NOTICE 'Company/Firm ID: %', new_company_id;
    
END $$;

-- Verify all records were created
SELECT 'VERIFICATION - All records should exist now:' as message;

SELECT 'auth.users' as table_name, COUNT(*) as record_count
FROM auth.users 
WHERE email = 'somasekhar.addakula@gmail.com'

UNION ALL

SELECT 'profiles' as table_name, COUNT(*) 
FROM public.profiles 
WHERE email = 'somasekhar.addakula@gmail.com'

UNION ALL

SELECT 'business_profiles' as table_name, COUNT(*)
FROM public.business_profiles bp
JOIN public.profiles p ON bp.firm_user_id = p.user_id
WHERE p.email = 'somasekhar.addakula@gmail.com'

UNION ALL

SELECT 'squidgy_agent_business_setup' as table_name, COUNT(*)
FROM public.squidgy_agent_business_setup sabs
JOIN public.profiles p ON sabs.firm_user_id = p.user_id
WHERE p.email = 'somasekhar.addakula@gmail.com';

-- Show the profile details
SELECT 'PROFILE_CREATED:' as info, id, user_id, email, full_name, company_id, role
FROM public.profiles 
WHERE email = 'somasekhar.addakula@gmail.com';