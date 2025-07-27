-- FIX THE BROKEN TRIGGER THAT'S CAUSING SIGNUP TO FAIL
-- The current handle_new_user() function is missing required fields

-- Drop the broken trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Fix the handle_new_user function with all required fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN 
  IF NEW.email IS NOT NULL THEN
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
      gen_random_uuid(),                                         -- Generate user_id
      NEW.email,                                                 -- User's email
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), -- Full name or email
      NULL,                                                      -- No avatar initially
      gen_random_uuid(),                                         -- Generate company_id
      'member'                                                   -- Default role
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify it exists
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';