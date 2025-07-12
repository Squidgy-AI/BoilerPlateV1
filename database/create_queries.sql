-- Profiles table (User accounts)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  user_id UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'member', -- 'admin', 'member', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Companies table (For B2B multi-tenancy)
CREATE TABLE companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  industry TEXT,
  size TEXT, -- 'small', 'medium', 'enterprise'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Groups table (Conversation groups)
CREATE TABLE groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group members (Join table for users/agents in groups)
CREATE TABLE group_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID, -- Can be a real user ID or a virtual agent ID
  role TEXT DEFAULT 'member', -- 'admin', 'member', etc.
  is_agent BOOLEAN DEFAULT FALSE,
  agent_type TEXT, -- 'ProductManager', 'PreSalesConsultant', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Direct messages between users
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE SET NULL, 
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'image', 'file', etc.
  is_read BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group messages
CREATE TABLE group_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'image', 'file', etc.
  is_agent BOOLEAN DEFAULT FALSE,
  agent_type TEXT, -- If sent by an agent
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Read receipts for group messages
CREATE TABLE group_message_reads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES group_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invitations
CREATE TABLE invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  token TEXT NOT NULL UNIQUE, -- Used for email invitation links
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

-- Agent configurations (Custom settings for each agent)
CREATE TABLE agent_configurations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL, -- 'ProductManager', 'PreSalesConsultant', etc.
  is_enabled BOOLEAN DEFAULT TRUE,
  config JSONB DEFAULT '{}', -- Flexible configuration options
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Website data (For tracking analyzed websites)
CREATE TABLE website_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL,
  url TEXT NOT NULL,
  screenshot_path TEXT,
  favicon_path TEXT,
  analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session history (Track active sessions)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_group BOOLEAN DEFAULT FALSE,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  agent_id TEXT, -- For agent sessions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- N8N integration logs (For debugging and tracking)
CREATE TABLE n8n_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent TEXT NOT NULL,
  message TEXT NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  status TEXT, -- 'success', 'error'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guest users table (For users who haven't fully registered yet)
CREATE TABLE guest_users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  phone TEXT UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Users forgot password table (For password reset functionality)
CREATE TABLE users_forgot_password (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reset_token TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);