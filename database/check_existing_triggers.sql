-- CHECK EXISTING TRIGGERS ON AUTH.USERS TABLE
-- Run this first to see what triggers already exist

-- 1. Check all triggers on auth.users table
SELECT 
    trigger_name, 
    event_manipulation,
    event_object_table, 
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users'
ORDER BY trigger_name;

-- 2. Check all functions that might be related to auth triggers
SELECT 
    routine_name, 
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%user%'
OR routine_name LIKE '%auth%'
OR routine_name LIKE '%profile%'
ORDER BY routine_name;

-- 3. Check if handle_new_user function exists specifically
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'handle_new_user';

-- 4. Check all triggers in the database (broader view)
SELECT 
    trigger_schema,
    trigger_name, 
    event_object_schema,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_schema IN ('public', 'auth')
ORDER BY trigger_schema, event_object_table, trigger_name;