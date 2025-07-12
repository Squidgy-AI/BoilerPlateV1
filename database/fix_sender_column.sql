-- Fix the sender column issue properly
-- The backend is trying to save both user_message and agent_response in a single row
-- but not setting the sender field, which violates the NOT NULL constraint

-- For now, let's update any existing null sender values based on the data
UPDATE chat_history 
SET sender = 'user' 
WHERE sender IS NULL 
AND user_message IS NOT NULL 
AND (agent_response IS NULL OR agent_response = '');

UPDATE chat_history 
SET sender = 'agent' 
WHERE sender IS NULL 
AND agent_response IS NOT NULL 
AND (user_message IS NULL OR user_message = '');

-- For rows that have both user_message and agent_response, we need backend fix
-- These should be split into separate rows by the backend

-- Check what rows still have null sender
SELECT * FROM chat_history WHERE sender IS NULL;