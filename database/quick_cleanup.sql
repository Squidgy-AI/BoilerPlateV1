-- QUICK CLEANUP - Delete user from all tables

-- Delete from squidgy_agent_business_setup (references profiles)
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

-- Delete from auth.users
DELETE FROM auth.users 
WHERE email = 'somasekhar.addakula@gmail.com';

-- Verify cleanup
SELECT 'Cleanup complete - should be 0:' as message, COUNT(*) as remaining_users
FROM auth.users 
WHERE email = 'somasekhar.addakula@gmail.com';