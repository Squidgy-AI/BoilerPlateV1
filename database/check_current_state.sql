-- CHECK CURRENT STATE OF DATABASE
-- See if the user exists anywhere and what's causing the error

-- 1. Check if user exists in auth.users
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'somasekhar.addakula@gmail.com';

-- 2. Check if user exists in profiles table  
SELECT id, user_id, email, full_name, company_id
FROM public.profiles 
WHERE email = 'somasekhar.addakula@gmail.com';

-- 3. Check if there are any constraints or triggers that could be failing
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';

-- 4. Check if we have any custom functions that might interfere
SELECT routine_name, routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (routine_name LIKE '%user%' OR routine_name LIKE '%auth%')
ORDER BY routine_name;

-- 5. Check auth.users table structure to see if anything is wrong
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'auth' 
AND table_name = 'users'
ORDER BY ordinal_position;