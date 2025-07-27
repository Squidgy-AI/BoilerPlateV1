-- COMPLETELY REMOVE USER FROM ALL TABLES
-- This will clean up somasekhar.addakula@gmail.com from everywhere

-- 1. First get the user details to see what exists
SELECT 'AUTH USERS:' as table_name, id::text, email, email_confirmed_at::text 
FROM auth.users 
WHERE email = 'somasekhar.addakula@gmail.com'

UNION ALL

SELECT 'PROFILES:' as table_name, id::text, email, created_at::text
FROM public.profiles 
WHERE email = 'somasekhar.addakula@gmail.com'

UNION ALL

SELECT 'BUSINESS_PROFILES:' as table_name, bp.id::text, 
       COALESCE(bp.business_email, 'no_email') as email, 
       bp.created_at::text
FROM public.business_profiles bp
JOIN public.profiles p ON bp.firm_user_id = p.user_id
WHERE p.email = 'somasekhar.addakula@gmail.com'

UNION ALL

SELECT 'AGENT_SETUP:' as table_name, sabs.id::text, 
       'agent_records' as email,
       sabs.created_at::text
FROM public.squidgy_agent_business_setup sabs
JOIN public.profiles p ON sabs.firm_user_id = p.user_id
WHERE p.email = 'somasekhar.addakula@gmail.com';

-- 2. DELETE FROM ALL TABLES (Run this after checking above)

-- Delete from squidgy_agent_business_setup first (references profiles)
DELETE FROM public.squidgy_agent_business_setup 
WHERE firm_user_id IN (
  SELECT user_id FROM public.profiles 
  WHERE email = 'somasekhar.addakula@gmail.com'
);

-- Delete from business_profiles (references profiles) 
DELETE FROM public.business_profiles 
WHERE firm_user_id IN (
  SELECT user_id FROM public.profiles 
  WHERE email = 'somasekhar.addakula@gmail.com'
);

-- Delete from profiles table
DELETE FROM public.profiles 
WHERE email = 'somasekhar.addakula@gmail.com';

-- Delete from auth.users (this will cascade if there are constraints)
DELETE FROM auth.users 
WHERE email = 'somasekhar.addakula@gmail.com';

-- 3. VERIFY CLEANUP - Should return 0 rows for all
SELECT 'CLEANUP VERIFICATION - Should be empty:' as message;

SELECT 'auth.users' as table_name, COUNT(*) as remaining_records
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

SELECT 'agent_setup' as table_name, COUNT(*)
FROM public.squidgy_agent_business_setup sabs
JOIN public.profiles p ON sabs.firm_user_id = p.user_id
WHERE p.email = 'somasekhar.addakula@gmail.com';