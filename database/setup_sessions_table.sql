-- Setup Sessions Table and RLS Policies
-- Run this in Supabase SQL Editor

-- Create sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  is_group BOOLEAN DEFAULT FALSE,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  agent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only access their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON sessions;

-- Create RLS policies
CREATE POLICY "Users can only access their own sessions" ON sessions
    FOR ALL USING (user_id = (SELECT user_id FROM profiles WHERE id = auth.uid()));

-- Grant permissions
GRANT ALL ON sessions TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_agent_id ON sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON sessions(last_active);

-- Test query to verify table exists and RLS works
SELECT 'Sessions table ready' as status, COUNT(*) as existing_sessions FROM sessions;