-- CHECK AUTH CONFIGURATION AND CONSTRAINTS

-- 1. Check if there are any auth schema issues
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'auth';

-- 2. Check for any database triggers on auth.users that might be failing
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';

-- 3. Check if there are any custom RLS policies on auth.users
SELECT * FROM pg_policies 
WHERE schemaname = 'auth' 
AND tablename = 'users';

-- 4. Check auth.users table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'auth' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 5. Check if the user was partially created
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'somasekhar.addakula@gmail.com';

-- 6. Try to manually insert a test user to see specific error
-- This will help identify the exact constraint or trigger causing the issue
/*
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'test.manual@example.com',
  crypt('TestPassword123!', gen_salt('bf')),
  null,
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Test User"}'::jsonb,
  'authenticated',
  'authenticated'
);
*/