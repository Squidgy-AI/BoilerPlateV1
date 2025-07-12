-- Upsert solar setup completion chat history for dmacproject123@gmail.com
-- This handles existing records by using unique session IDs and timestamps

-- First, let's check what already exists
SELECT 
  session_id,
  agent_id,
  sender,
  LEFT(message, 50) || '...' as message_preview,
  timestamp
FROM public.chat_history 
WHERE user_id = (SELECT user_id::text FROM public.profiles WHERE email = 'dmacproject123@gmail.com' LIMIT 1)
  AND agent_id = 'SOLAgent'
ORDER BY timestamp DESC;

-- Delete any existing SOLAgent records for this user to start fresh
DELETE FROM public.chat_history 
WHERE user_id = (SELECT user_id::text FROM public.profiles WHERE email = 'dmacproject123@gmail.com' LIMIT 1)
  AND agent_id = 'SOLAgent';

-- Get user info for the insert
WITH user_info AS (
  SELECT user_id::text as user_id_text, user_id as user_id_uuid
  FROM public.profiles 
  WHERE email = 'dmacproject123@gmail.com' 
  LIMIT 1
)

-- Insert fresh solar setup completion messages with unique timestamps
INSERT INTO public.chat_history (
  user_id,
  session_id, 
  agent_id,
  sender,
  message,
  timestamp,
  agent_name
) 
SELECT 
  ui.user_id_text,
  ui.user_id_text || '_SOLAgent_' || EXTRACT(EPOCH FROM NOW())::bigint,
  'SOLAgent',
  'agent',
  'Hello! I''m your Solar Sales Specialist. I help customers find the perfect solar energy solutions, calculate savings, and guide them through the transition to renewable energy. Let me gather some information about your solar business to provide accurate quotes and recommendations.',
  NOW() - INTERVAL '2 hours',
  'Solar Sales Specialist'
FROM user_info ui

UNION ALL

SELECT 
  ui.user_id_text,
  ui.user_id_text || '_SOLAgent_' || EXTRACT(EPOCH FROM NOW())::bigint,
  'SOLAgent',
  'user',
  'I need to configure my solar business parameters for customer quotes',
  NOW() - INTERVAL '2 hours' + INTERVAL '1 minute',
  'Solar Sales Specialist'
FROM user_info ui

UNION ALL

SELECT 
  ui.user_id_text,
  ui.user_id_text || '_SOLAgent_' || EXTRACT(EPOCH FROM NOW())::bigint,
  'SOLAgent',
  'agent',
  'Perfect! I''ve successfully configured your solar business with all 13 parameters including:
• Company information and branding
• Solar panel specifications and pricing
• Installation costs and labor rates  
• Financing options and incentives
• Energy calculations and savings models
• Regional utility rates and policies
• Warranty and maintenance details

Your Solar Sales Specialist is now fully configured and ready to help customers with accurate solar quotes, savings calculations, and guidance through their solar journey! 🌞✅',
  NOW() - INTERVAL '2 hours' + INTERVAL '5 minutes',
  'Solar Sales Specialist'
FROM user_info ui;

-- Also enable SOL Agent for this user
INSERT INTO public.squidgy_agent_business_setup (firm_user_id, agent_id, agent_name, is_enabled, setup_json)
SELECT 
  p.user_id,
  'SOLAgent',
  'Solar Sales Specialist',
  true,  -- Enable SOL Agent since setup is complete
  jsonb_build_object(
    'completed', true,
    'configured_at', NOW()::text,
    'solar_params_count', 13,
    'status', 'fully_configured'
  )
FROM public.profiles p
WHERE p.email = 'dmacproject123@gmail.com'
ON CONFLICT (firm_user_id, agent_id) 
DO UPDATE SET 
  is_enabled = true,
  setup_json = jsonb_build_object(
    'completed', true,
    'configured_at', NOW()::text,
    'solar_params_count', 13,
    'status', 'fully_configured'
  ),
  updated_at = NOW();

-- Verify the final result
SELECT 
  'Chat History' as table_name,
  COUNT(*) as record_count
FROM public.chat_history 
WHERE user_id = (SELECT user_id::text FROM public.profiles WHERE email = 'dmacproject123@gmail.com' LIMIT 1)
  AND agent_id = 'SOLAgent'

UNION ALL

SELECT 
  'Agent Setup' as table_name,
  COUNT(*) as record_count
FROM public.squidgy_agent_business_setup 
WHERE firm_user_id = (SELECT user_id FROM public.profiles WHERE email = 'dmacproject123@gmail.com' LIMIT 1)
  AND agent_id = 'SOLAgent'
  AND is_enabled = true;

-- Show the inserted chat history
SELECT 
  session_id,
  agent_id,
  sender,
  LEFT(message, 100) || '...' as message_preview,
  timestamp,
  agent_name
FROM public.chat_history 
WHERE user_id = (SELECT user_id::text FROM public.profiles WHERE email = 'dmacproject123@gmail.com' LIMIT 1)
  AND agent_id = 'SOLAgent'
ORDER BY timestamp ASC;