-- Create table for feedback followup tracking
-- This table tracks when to show feedback reminders to users

CREATE TABLE IF NOT EXISTS public.followup_feedback_on_firm_user (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    
    -- Timing configuration (in minutes)
    initial_reminder_minutes integer DEFAULT 2 NOT NULL,
    resend_reminder_minutes integer DEFAULT 5 NOT NULL,
    
    -- Tracking timestamps
    user_first_active_at timestamp with time zone DEFAULT now() NOT NULL,
    first_reminder_sent_at timestamp with time zone NULL,
    first_reminder_responded_at timestamp with time zone NULL,
    first_reminder_response text NULL,
    
    second_reminder_sent_at timestamp with time zone NULL,
    second_reminder_responded_at timestamp with time zone NULL,
    second_reminder_response text NULL,
    
    -- User preferences
    wants_feedback_call boolean NULL,
    feedback_call_scheduled_at timestamp with time zone NULL,
    feedback_call_completed_at timestamp with time zone NULL,
    
    -- User info (cached from profiles for easy access)
    user_email text NULL,
    user_full_name text NULL,
    user_avatar_url text NULL,
    
    -- Status tracking
    is_completed boolean DEFAULT false NOT NULL,
    is_disabled boolean DEFAULT false NOT NULL, -- User can disable reminders
    
    -- Metadata
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_followup_firm_user_id 
ON public.followup_feedback_on_firm_user USING btree (firm_user_id);

CREATE INDEX IF NOT EXISTS idx_feedback_followup_status 
ON public.followup_feedback_on_firm_user USING btree (is_completed, is_disabled);

CREATE INDEX IF NOT EXISTS idx_feedback_followup_reminders 
ON public.followup_feedback_on_firm_user USING btree (user_first_active_at, first_reminder_sent_at, second_reminder_sent_at);

-- Create function to update user info from profiles table
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

-- Create trigger to auto-update user info
CREATE TRIGGER trigger_update_feedback_user_info
    BEFORE INSERT OR UPDATE ON public.followup_feedback_on_firm_user
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_user_info();

-- Add comments for documentation
COMMENT ON TABLE public.followup_feedback_on_firm_user IS 'Tracks feedback reminder system for users - when to show reminders and responses';
COMMENT ON COLUMN public.followup_feedback_on_firm_user.initial_reminder_minutes IS 'Minutes after first activity to show initial feedback reminder (default: 2)';
COMMENT ON COLUMN public.followup_feedback_on_firm_user.resend_reminder_minutes IS 'Minutes after first reminder to resend if no response (default: 5)';
COMMENT ON COLUMN public.followup_feedback_on_firm_user.wants_feedback_call IS 'User preference for scheduling feedback call with Seth';
COMMENT ON COLUMN public.followup_feedback_on_firm_user.is_disabled IS 'User has disabled feedback reminders';