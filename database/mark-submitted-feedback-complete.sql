-- Mark users who have already submitted feedback as completed
-- This ensures they never see feedback reminders again

-- Update users who have already responded to first or second reminder
UPDATE public.followup_feedback_on_firm_user 
SET 
  is_completed = true,
  updated_at = now()
WHERE 
  (first_reminder_responded_at IS NOT NULL OR second_reminder_responded_at IS NOT NULL)
  AND is_completed = false;

-- Specifically mark the user from the screenshot as completed
UPDATE public.followup_feedback_on_firm_user 
SET 
  is_completed = true,
  updated_at = now()
WHERE 
  firm_user_id = '80b957fc-de1d-4f28-920c-41e0e2e28e5e'
  AND is_completed = false;

-- Verify the updates
SELECT 
  firm_user_id,
  user_email,
  user_full_name,
  first_reminder_response,
  wants_feedback_call,
  is_completed,
  updated_at
FROM public.followup_feedback_on_firm_user
WHERE 
  first_reminder_responded_at IS NOT NULL 
  OR second_reminder_responded_at IS NOT NULL
ORDER BY updated_at DESC;