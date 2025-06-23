-- Fix the sender column to allow null values temporarily
-- This addresses the error: "null value in column 'sender' of relation 'chat_history' violates not-null constraint"

-- Make sender column nullable
ALTER TABLE chat_history 
ALTER COLUMN sender DROP NOT NULL;

-- Update any null sender values to 'unknown'
UPDATE chat_history 
SET sender = 'unknown' 
WHERE sender IS NULL;

-- Optionally, you can make it NOT NULL again after fixing the data
-- ALTER TABLE chat_history 
-- ALTER COLUMN sender SET NOT NULL;