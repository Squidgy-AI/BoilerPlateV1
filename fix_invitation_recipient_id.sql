-- Fix invitation recipient_id update
-- This SQL function automatically updates recipient_id in invitations table
-- when a new user signs up with an email that matches a pending invitation

-- Create function to update invitation recipient_id
CREATE OR REPLACE FUNCTION update_invitation_recipient_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Update any pending invitations for this email to set the recipient_id
    UPDATE public.invitations 
    SET recipient_id = NEW.user_id
    WHERE recipient_email = NEW.email 
    AND status = 'pending' 
    AND recipient_id IS NULL;
    
    -- Log how many invitations were updated
    IF FOUND THEN
        RAISE NOTICE 'Updated invitation recipient_id for email: %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS update_invitation_recipient_id_trigger ON public.profiles;

CREATE TRIGGER update_invitation_recipient_id_trigger
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_invitation_recipient_id();

-- Manual fix for existing accepted invitations with null recipient_id
-- This updates recipient_id for invitations that are marked as 'accepted' but have null recipient_id
UPDATE public.invitations 
SET recipient_id = profiles.user_id
FROM public.profiles 
WHERE invitations.recipient_email = profiles.email 
AND invitations.status = 'accepted' 
AND invitations.recipient_id IS NULL;

-- Verify the fix
SELECT 
    i.recipient_email,
    i.status,
    i.recipient_id,
    p.user_id as profile_user_id,
    p.full_name
FROM public.invitations i
LEFT JOIN public.profiles p ON i.recipient_email = p.email
WHERE i.recipient_email = 'somasekhar.addakula@gmail.com'
ORDER BY i.created_at DESC;