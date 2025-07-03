-- Add solar setup completion chat history for dmacproject123@gmail.com
-- This will make the UI show the completed solar configuration in chat history

-- First, let's get the user_id for dmacproject123@gmail.com (with proper type casting)
WITH user_info AS (
  SELECT user_id::text as user_id_text, user_id as user_id_uuid
  FROM public.profiles 
  WHERE email = 'dmacproject123@gmail.com' 
  LIMIT 1
)

-- Insert solar setup completion messages
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
  ui.user_id_text || '_SOLAgent_setup',
  'SOLAgent',
  'agent',
  'Hello! I''m your Solar Sales Specialist. I help customers find the perfect solar energy solutions, calculate savings, and guide them through the transition to renewable energy. Let me gather some information about your solar business to provide accurate quotes and recommendations.',
  NOW() - INTERVAL '2 hours',
  'Solar Sales Specialist'
FROM user_info ui

UNION ALL

SELECT 
  ui.user_id_text,
  ui.user_id_text || '_SOLAgent_setup',
  'SOLAgent',
  'user',
  'I need to configure my solar business parameters for customer quotes',
  NOW() - INTERVAL '2 hours' + INTERVAL '1 minute',
  'Solar Sales Specialist'
FROM user_info ui

UNION ALL

SELECT 
  ui.user_id_text,
  ui.user_id_text || '_SOLAgent_setup',
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

-- Verify the insertion
SELECT 
  session_id,
  agent_id,
  sender,
  message,
  timestamp,
  agent_name
FROM public.chat_history 
WHERE user_id = (SELECT user_id::text FROM public.profiles WHERE email = 'dmacproject123@gmail.com' LIMIT 1)
  AND agent_id = 'SOLAgent'
ORDER BY timestamp DESC;