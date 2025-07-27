-- CHECK WHAT WAS ACTUALLY CREATED AFTER SIGNUP
-- Run this after doing signup to see what tables have records

-- Check auth.users
SELECT 'auth.users' as table_name, COUNT(*) as record_count, 
       string_agg(email, ', ') as emails
FROM auth.users 
WHERE email = 'somasekhar.addakula@gmail.com';

-- Check profiles  
SELECT 'profiles' as table_name, COUNT(*) as record_count,
       string_agg(email, ', ') as emails
FROM public.profiles 
WHERE email = 'somasekhar.addakula@gmail.com';

-- Check business_profiles (indirect check via profiles)
SELECT 'business_profiles' as table_name, COUNT(*) as record_count,
       'linked_to_profile' as info
FROM public.business_profiles bp
WHERE bp.firm_user_id IN (
  SELECT user_id FROM public.profiles 
  WHERE email = 'somasekhar.addakula@gmail.com'
);

-- Check agent setup (indirect check via profiles)  
SELECT 'squidgy_agent_business_setup' as table_name, COUNT(*) as record_count,
       string_agg(agent_id, ', ') as agent_ids
FROM public.squidgy_agent_business_setup sabs
WHERE sabs.firm_user_id IN (
  SELECT user_id FROM public.profiles 
  WHERE email = 'somasekhar.addakula@gmail.com'
);

-- Show the actual profile data if it exists
SELECT 'PROFILE_DETAILS:' as info, id, user_id, email, full_name, company_id, role
FROM public.profiles 
WHERE email = 'somasekhar.addakula@gmail.com';

-- Show auth user details if it exists  
SELECT 'AUTH_USER_DETAILS:' as info, id, email, email_confirmed_at, confirmed_at
FROM auth.users 
WHERE email = 'somasekhar.addakula@gmail.com';