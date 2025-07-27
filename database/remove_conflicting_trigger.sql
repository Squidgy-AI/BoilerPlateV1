-- REMOVE CONFLICTING AUTH TRIGGER
-- This trigger is causing "Database error saving new user" during signup

-- Drop the trigger that tries to create profiles automatically
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function as well
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Verify removal
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';
-- Should return 0 rows

-- Note: We now handle profile creation manually in the email confirmation flow
-- This provides better error handling and control