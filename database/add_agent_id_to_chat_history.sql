-- Add agent_id column to chat_history table
-- This will make it easier to query chat history by agent

-- Add the agent_id column after user_id
ALTER TABLE public.chat_history 
ADD COLUMN IF NOT EXISTS agent_id text NULL;

-- Update existing data to set agent_id to 'PersonalAssistant' for all existing records
UPDATE public.chat_history 
SET agent_id = 'PersonalAssistant' 
WHERE agent_id IS NULL;

-- Make agent_id NOT NULL after updating existing data
ALTER TABLE public.chat_history 
ALTER COLUMN agent_id SET NOT NULL;

-- Add index for efficient querying by agent_id
CREATE INDEX IF NOT EXISTS idx_chat_history_agent_id ON public.chat_history USING btree (agent_id) TABLESPACE pg_default;

-- Add composite index for user_id + agent_id + timestamp (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_chat_history_user_agent_timestamp ON public.chat_history USING btree (user_id, agent_id, "timestamp" DESC) TABLESPACE pg_default;

-- Add composite index for session_id + agent_id
CREATE INDEX IF NOT EXISTS idx_chat_history_session_agent ON public.chat_history USING btree (session_id, agent_id) TABLESPACE pg_default;

-- Update the unique message hash index to include agent_id for better uniqueness
DROP INDEX IF EXISTS idx_chat_history_unique_message;

-- Recreate the message_hash column to include agent_id
ALTER TABLE public.chat_history 
DROP COLUMN IF EXISTS message_hash;

ALTER TABLE public.chat_history 
ADD COLUMN message_hash text GENERATED ALWAYS AS (
  md5(
    (
      (
        (
          (
            (
              ((session_id || '|'::text) || user_id) || '|'::text
            ) || agent_id
          ) || '|'::text
        ) || sender
      ) || '|'::text
    ) || message
  )
) STORED;

-- Recreate the unique index on message_hash
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_history_unique_message ON public.chat_history USING btree (message_hash) TABLESPACE pg_default;

-- Add comment to table for documentation
COMMENT ON TABLE public.chat_history IS 'Stores chat messages between users and agents with agent_id for easy querying';
COMMENT ON COLUMN public.chat_history.agent_id IS 'Identifier for the agent (e.g., PersonalAssistant, SOLAgent, etc.)';