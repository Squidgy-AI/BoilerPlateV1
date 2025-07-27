-- SIMPLE CHECK - DON'T TOUCH SUPABASE AUTH
-- Just check if there are any custom triggers we accidentally added

-- Check if we accidentally added any triggers to auth.users
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';

-- Check if handle_new_user function exists (we may have created it by mistake)
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'handle_new_user';

-- If the above returns anything, we need to remove it