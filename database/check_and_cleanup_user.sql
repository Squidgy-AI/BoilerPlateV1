-- CHECK AND CLEANUP EXISTING USER
-- Run this in Supabase SQL Editor

-- 1. Check if user exists in auth.users
SELECT id, email, email_confirmed_at, created_at, last_sign_in_at
FROM auth.users 
WHERE email = 'somasekhar.addakula@gmail.com';

-- 2. Check if user has a profile
SELECT * FROM public.profiles 
WHERE email = 'somasekhar.addakula@gmail.com';

-- 3. To delete the user and try fresh signup (BE CAREFUL - this deletes the user!)
-- Uncomment and run only if you want to delete:
/*
DELETE FROM auth.users 
WHERE email = 'somasekhar.addakula@gmail.com';
*/

-- 4. Alternative: If user exists but email not confirmed, you can manually confirm:
-- Uncomment and run if needed:
/*
UPDATE auth.users 
SET email_confirmed_at = now(), 
    confirmed_at = now()
WHERE email = 'somasekhar.addakula@gmail.com';
*/