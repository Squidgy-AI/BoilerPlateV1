-- Fix missing unique constraint on firm_user_id for followup_feedback_on_firm_user table
-- This constraint is needed for upsert operations with ON CONFLICT

-- First, check if there are any duplicate firm_user_id records
SELECT firm_user_id, COUNT(*) as count
FROM public.followup_feedback_on_firm_user 
GROUP BY firm_user_id 
HAVING COUNT(*) > 1;

-- If duplicates exist, keep only the most recent record for each firm_user_id
-- Delete older duplicates (keeping the one with the latest updated_at)
DELETE FROM public.followup_feedback_on_firm_user 
WHERE id NOT IN (
  SELECT DISTINCT ON (firm_user_id) id
  FROM public.followup_feedback_on_firm_user 
  ORDER BY firm_user_id, updated_at DESC
);

-- Add unique constraint on firm_user_id
ALTER TABLE public.followup_feedback_on_firm_user 
ADD CONSTRAINT followup_feedback_firm_user_unique UNIQUE (firm_user_id);

-- Verify the constraint was added
SELECT 
  constraint_name, 
  constraint_type, 
  table_name 
FROM information_schema.table_constraints 
WHERE table_name = 'followup_feedback_on_firm_user' 
AND constraint_type = 'UNIQUE';

-- Test that upsert now works
-- This should not error if the constraint is properly added