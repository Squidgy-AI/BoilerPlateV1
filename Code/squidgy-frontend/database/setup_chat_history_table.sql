-- Setup Chat History Table and Related Backend Tables
-- Run this in Supabase SQL Editor to enable chat history functionality

-- 1. Create chat_history table (from backend schema)
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create n8n_logs table (from backend schema) 
CREATE TABLE IF NOT EXISTS n8n_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent TEXT NOT NULL,
  message TEXT NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create website_data table (from backend schema)
CREATE TABLE IF NOT EXISTS website_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL,
  url TEXT NOT NULL,
  screenshot_path TEXT,
  favicon_path TEXT,
  analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create tools_usage table (from backend schema)
CREATE TABLE IF NOT EXISTS tools_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS on all tables
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools_usage ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for chat_history
CREATE POLICY "Users can access their own chat history" ON chat_history
    FOR ALL USING (user_id = (SELECT user_id::text FROM profiles WHERE id = auth.uid()));

-- 7. Create RLS policies for n8n_logs (admin access for debugging)
CREATE POLICY "Authenticated users can access n8n logs" ON n8n_logs
    FOR ALL USING (auth.role() = 'authenticated');

-- 8. Create RLS policies for website_data
CREATE POLICY "Users can access their own website data" ON website_data
    FOR ALL USING (true); -- Allow all authenticated users for now

-- 9. Create RLS policies for tools_usage
CREATE POLICY "Users can access their own tools usage" ON tools_usage
    FOR ALL USING (true); -- Allow all authenticated users for now

-- 10. Grant permissions
GRANT ALL ON chat_history TO authenticated;
GRANT ALL ON n8n_logs TO authenticated;
GRANT ALL ON website_data TO authenticated;
GRANT ALL ON tools_usage TO authenticated;

-- 11. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_chat_history_session ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp ON chat_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_n8n_logs_session ON n8n_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_website_data_session ON website_data(session_id);
CREATE INDEX IF NOT EXISTS idx_tools_usage_session ON tools_usage(session_id);

-- 12. Test query to verify everything is working
SELECT 'Backend tables ready' as status,
       (SELECT COUNT(*) FROM chat_history) as existing_chat_history,
       (SELECT COUNT(*) FROM n8n_logs) as existing_n8n_logs,
       (SELECT COUNT(*) FROM website_data) as existing_website_data,
       (SELECT COUNT(*) FROM tools_usage) as existing_tools_usage;