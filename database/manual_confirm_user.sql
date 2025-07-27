-- MANUALLY CONFIRM USER TO TEST THE REST OF THE FLOW
-- This bypasses the email confirmation issue

-- First, check if user exists
SELECT id, email, email_confirmed_at, confirmed_at 
FROM auth.users 
WHERE email = 'somasekhar.addakula@gmail.com';

-- Manually confirm the user (if user exists)
UPDATE auth.users 
SET 
    email_confirmed_at = now(),
    confirmed_at = now(),
    updated_at = now()
WHERE email = 'somasekhar.addakula@gmail.com';

-- Verify the user is now confirmed
SELECT id, email, email_confirmed_at, confirmed_at 
FROM auth.users 
WHERE email = 'somasekhar.addakula@gmail.com';