-- Update feedback reminder system to use days instead of minutes
-- Add testing mode for immediate testing without waiting days

-- Add testing mode column
ALTER TABLE public.followup_feedback_on_firm_user 
ADD COLUMN IF NOT EXISTS testing_mode boolean DEFAULT false NOT NULL;

-- Rename columns to reflect days instead of minutes
ALTER TABLE public.followup_feedback_on_firm_user 
RENAME COLUMN initial_reminder_minutes TO initial_reminder_days;

ALTER TABLE public.followup_feedback_on_firm_user 
RENAME COLUMN resend_reminder_minutes TO resend_reminder_days;

-- Update default values: 7 days for first, 3 days for second
ALTER TABLE public.followup_feedback_on_firm_user 
ALTER COLUMN initial_reminder_days SET DEFAULT 7;

ALTER TABLE public.followup_feedback_on_firm_user 
ALTER COLUMN resend_reminder_days SET DEFAULT 3;

-- Update existing records to use day values (convert minutes to days)
-- Only update records that still have minute values (< 24 hours worth)
UPDATE public.followup_feedback_on_firm_user 
SET 
  initial_reminder_days = 7,
  resend_reminder_days = 3
WHERE initial_reminder_days < 24; -- Assume these are still in minutes

-- Update column comments
COMMENT ON COLUMN public.followup_feedback_on_firm_user.initial_reminder_days IS 'Days after first activity to show initial feedback reminder (default: 7, testing: 0.0014 = 2 minutes)';
COMMENT ON COLUMN public.followup_feedback_on_firm_user.resend_reminder_days IS 'Days after first reminder to resend if no response (default: 3, testing: 0.0035 = 5 minutes)';
COMMENT ON COLUMN public.followup_feedback_on_firm_user.testing_mode IS 'When true, uses minute-based timing for immediate testing (2 min + 5 min)';

-- Create function to get effective timing based on testing mode
CREATE OR REPLACE FUNCTION get_effective_reminder_timing(
  initial_days NUMERIC,
  resend_days NUMERIC, 
  is_testing_mode BOOLEAN DEFAULT FALSE
) RETURNS TABLE(initial_minutes NUMERIC, resend_minutes NUMERIC) AS $$
BEGIN
  IF is_testing_mode THEN
    -- Testing mode: Use 2 minutes and 5 minutes
    RETURN QUERY SELECT 2::NUMERIC, 5::NUMERIC;
  ELSE
    -- Production mode: Convert days to minutes
    RETURN QUERY SELECT (initial_days * 24 * 60)::NUMERIC, (resend_days * 24 * 60)::NUMERIC;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'followup_feedback_on_firm_user' 
AND column_name IN ('initial_reminder_days', 'resend_reminder_days', 'testing_mode')
ORDER BY column_name;