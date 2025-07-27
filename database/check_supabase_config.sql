-- CHECK SUPABASE AUTH CONFIGURATION
-- This will help us understand why tokens are expiring immediately

-- Check auth schema configuration
SELECT 
    schemaname, 
    tablename, 
    tableowner 
FROM pg_tables 
WHERE schemaname = 'auth' 
ORDER BY tablename;

-- Check if there are any custom auth configurations
SELECT 
    name, 
    setting 
FROM pg_settings 
WHERE name LIKE '%auth%' 
   OR name LIKE '%jwt%'
   OR name LIKE '%token%'
ORDER BY name;

-- Check auth.users table structure to see if there are any custom constraints
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'auth' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Check if email confirmation is properly enabled
-- This will show us if there are any custom auth functions or triggers
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'auth'
ORDER BY routine_name;