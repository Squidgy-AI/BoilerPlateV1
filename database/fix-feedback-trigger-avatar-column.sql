-- Fix trigger function to use correct avatar column name
-- The trigger was referencing 'avatar_url' which doesn't exist in profiles table
-- The correct column name is 'profile_avatar_url'

-- Drop and recreate the function with correct column reference
DROP FUNCTION IF EXISTS update_feedback_user_info() CASCADE;

CREATE OR REPLACE FUNCTION update_feedback_user_info()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user info from profiles table
    SELECT email, full_name, profile_avatar_url
    INTO NEW.user_email, NEW.user_full_name, NEW.user_avatar_url
    FROM public.profiles 
    WHERE user_id = NEW.firm_user_id;
    
    -- Update timestamp
    NEW.updated_at = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_feedback_user_info
    BEFORE INSERT OR UPDATE ON public.followup_feedback_on_firm_user
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_user_info();

-- Test the fix by checking if the function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'update_feedback_user_info';