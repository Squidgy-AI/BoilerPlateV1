-- Migration to fix chat_history table schema mismatch
-- This fixes the error: "Could not find the 'agent_response' column of 'chat_history' in the schema cache"

-- Add missing columns that backend expects
ALTER TABLE chat_history 
ADD COLUMN IF NOT EXISTS agent_response TEXT;

ALTER TABLE chat_history 
ADD COLUMN IF NOT EXISTS user_message TEXT;

ALTER TABLE chat_history 
ADD COLUMN IF NOT EXISTS agent_name TEXT;

-- Migrate existing data from 'message' column to 'user_message' if needed
-- This preserves any existing chat history
UPDATE chat_history 
SET user_message = message 
WHERE user_message IS NULL 
AND message IS NOT NULL 
AND sender = 'user';

UPDATE chat_history 
SET agent_response = message 
WHERE agent_response IS NULL 
AND message IS NOT NULL 
AND sender = 'agent';

-- Update schema documentation
COMMENT ON COLUMN chat_history.agent_response IS 'The response from the AI agent';
COMMENT ON COLUMN chat_history.user_message IS 'The message from the user';
COMMENT ON COLUMN chat_history.agent_name IS 'The name of the agent that provided the response';
COMMENT ON COLUMN chat_history.message IS 'DEPRECATED - Use user_message or agent_response instead';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_history_agent_name ON chat_history(agent_name);

-- Verify all columns are present
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'chat_history' 
ORDER BY column_name;