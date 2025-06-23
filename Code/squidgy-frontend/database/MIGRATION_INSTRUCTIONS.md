# Database Migration Instructions

## Issue
The backend is failing with error: "Could not find the 'agent_response' column of 'chat_history' in the schema cache"

## Root Cause
The backend expects the `chat_history` table to have columns:
- `user_message` (for user messages)
- `agent_response` (for agent responses)

But the current schema only has a generic `message` column.

## Solution

### Step 1: Run the Migration in Supabase

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `add_agent_response_column.sql`
4. Execute the query

### Step 2: Refresh Schema Cache (Important!)

After running the migration, you MUST refresh the schema cache:

1. In Supabase Dashboard, go to Settings → API
2. Click "Reload Schema Cache" button
3. Wait a few seconds for the cache to refresh

Alternative method:
- Restart your Heroku dyno: `heroku restart -a squidgy-back-919bc0659e35`

### Step 3: Verify the Migration

Run this query in Supabase SQL Editor to verify all columns exist:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chat_history' 
ORDER BY column_name;
```

Expected columns:
- agent_name
- agent_response
- id
- message (deprecated)
- sender
- session_id
- timestamp
- user_id
- user_message

### Step 4: Test the Fix

1. Send a message through the chat interface
2. Check Heroku logs: `heroku logs --tail -a squidgy-back-919bc0659e35`
3. Verify no more "agent_response column not found" errors

### Additional Notes

- The migration preserves existing chat history by copying data from the old `message` column
- The `message` column is kept for backward compatibility but marked as deprecated
- New messages will use `user_message` and `agent_response` columns