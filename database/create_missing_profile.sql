-- CREATE MISSING PROFILE FOR EXISTING USER
-- Run this to create profile and related records for the existing confirmed user

-- Create profile for existing user
INSERT INTO public.profiles (
  id,
  user_id,
  email,
  full_name,
  profile_avatar_url,
  company_id,
  role
) VALUES (
  '1372c5bf-81e1-4ffb-9ebf-68c05d7aeb3f',  -- auth.users.id
  gen_random_uuid(),                         -- Generate new user_id
  'somasekhar.addakula@gmail.com',
  'Somasekhar Addakula',                     -- Update with actual name if different
  null,
  gen_random_uuid(),                         -- Generate company_id
  'member'
);

-- Get the created profile data
SELECT user_id, company_id FROM public.profiles 
WHERE id = '1372c5bf-81e1-4ffb-9ebf-68c05d7aeb3f';

-- After running above, use the user_id and company_id to create business_profiles
-- Replace the UUIDs below with actual values from above query
/*
INSERT INTO public.business_profiles (
  firm_user_id,
  firm_id
) VALUES (
  'REPLACE_WITH_USER_ID_FROM_ABOVE',     -- profiles.user_id
  'REPLACE_WITH_COMPANY_ID_FROM_ABOVE'   -- profiles.company_id
);
*/

-- Create PersonalAssistant agent
/*
INSERT INTO public.squidgy_agent_business_setup (
  firm_id,
  firm_user_id,
  agent_id,
  agent_name,
  setup_type,
  setup_json,
  is_enabled,
  session_id
) VALUES (
  'REPLACE_WITH_COMPANY_ID_FROM_ABOVE',   -- Same as profiles.company_id
  'REPLACE_WITH_USER_ID_FROM_ABOVE',      -- Same as profiles.user_id
  'PersonalAssistant',
  'Personal Assistant',
  'agent_config',
  '{"description": "Your general-purpose AI assistant", "capabilities": ["general_chat", "help", "information"]}'::jsonb,
  true,
  gen_random_uuid()
);
*/