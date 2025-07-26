-- FIX THE AUTH TRIGGER TO GENERATE REQUIRED VALUES
-- Update the trigger to properly create profiles with all required fields

-- First, ensure the update function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix the handle_new_user function to generate all required fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    user_id,
    email,
    full_name,
    profile_avatar_url,
    company_id,
    role
  )
  VALUES (
    NEW.id,                                                    -- auth.users.id
    gen_random_uuid(),                                         -- Generate random user_id
    NEW.email,                                                 -- User's email
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), -- Full name from metadata or email
    null,                                                      -- No avatar initially
    gen_random_uuid(),                                         -- Generate random company_id
    'member'                                                   -- Default role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger (drop first if exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify the trigger exists
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';

-- Test the function works (optional - remove this after testing)
/*
SELECT public.handle_new_user();
*/