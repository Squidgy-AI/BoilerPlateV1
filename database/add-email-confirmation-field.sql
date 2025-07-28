-- Add email confirmation tracking to profiles table
-- This enables proper email confirmation workflow

-- Add email_confirmed column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_confirmed boolean DEFAULT true NOT NULL;

-- For existing users, set email_confirmed to true (assume they're already verified)
UPDATE public.profiles 
SET email_confirmed = true 
WHERE email_confirmed IS NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email_confirmed 
ON public.profiles (email_confirmed);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.email_confirmed IS 'Whether user has confirmed their email address';

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'email_confirmed';

-- Check current email confirmation status for all users
SELECT 
  user_id,
  email,
  full_name,
  email_confirmed,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;