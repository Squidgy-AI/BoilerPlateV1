-- SQUIDGY DATABASE SCHEMA
-- Updated schema for authentication and agent business setup
-- Removes business_profiles table and uses updated column names

-- ============================================================================
-- PROFILES TABLE (Updated)
-- ============================================================================
create table public.profiles (
  id uuid not null,
  email text not null,
  full_name text null,
  profile_avatar_url text null,  -- Renamed from avatar_url
  company_id uuid null,           -- This is also the firm_id
  role text null default 'member'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid not null default extensions.uuid_generate_v4(),
  constraint profiles_pkey primary key (id),
  constraint profiles_email_key unique (email),
  constraint profiles_user_id_key unique (user_id),
  -- Note: company_id is just a UUID field, no foreign key constraint needed
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

-- Add updated_at trigger for profiles
create trigger update_profiles_updated_at BEFORE
update on profiles for EACH row
execute FUNCTION update_updated_at_column();

-- ============================================================================
-- AGENT BUSINESS SETUP TABLE (Complete Schema)
-- ============================================================================
create table public.squidgy_agent_business_setup (
  firm_id uuid null,                                    -- Same as profiles.company_id
  firm_user_id uuid not null,                          -- References profiles.user_id
  agent_id character varying(255) not null,            -- Agent identifier
  agent_name character varying(255) not null,          -- Display name for agent
  setup_json jsonb null default '{}'::jsonb,           -- Configuration JSON
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  is_enabled boolean not null default false,           -- Whether agent is active
  session_id uuid null,                                -- Session tracking UUID
  setup_type character varying(50) not null,           -- Type of setup
  id uuid not null default gen_random_uuid(),          -- Primary key UUID
  ghl_location_id text null,                           -- GoHighLevel location ID
  ghl_user_id text null,                               -- GoHighLevel user ID
  
  -- Primary key constraint (composite)
  constraint squidgy_agent_business_setup_pkey primary key (firm_user_id, agent_id, setup_type),
  
  -- Unique constraint
  constraint unique_user_agent_setup_type unique (firm_user_id, agent_id, setup_type),
  
  -- Check constraints for valid setup types
  constraint chk_setup_type_values check (
    (setup_type)::text = any (
      (array[
        'agent_config'::character varying,
        'SolarSetup'::character varying,
        'CalendarSetup'::character varying,
        'NotificationSetup'::character varying,
        'GHLSetup'::character varying,
        'FacebookIntegration'::character varying
      ])::text[]
    )
  ),
  constraint valid_setup_types check (
    (setup_type)::text = any (
      array[
        ('agent_config'::character varying)::text,
        ('SolarSetup'::character varying)::text,
        ('CalendarSetup'::character varying)::text,
        ('NotificationSetup'::character varying)::text,
        ('GHLSetup'::character varying)::text,
        ('FacebookIntegration'::character varying)::text
      ]
    )
  )
) TABLESPACE pg_default;

-- ============================================================================
-- INDEXES FOR AGENT BUSINESS SETUP TABLE
-- ============================================================================

-- Basic indexes
create index IF not exists idx_public_agent_setup_firm_user 
  on public.squidgy_agent_business_setup using btree (firm_user_id) TABLESPACE pg_default;

create index IF not exists idx_public_agent_setup_agent 
  on public.squidgy_agent_business_setup using btree (agent_id) TABLESPACE pg_default;

create index IF not exists idx_public_agent_setup_json 
  on public.squidgy_agent_business_setup using gin (setup_json) TABLESPACE pg_default;

create index IF not exists idx_public_agent_setup_enabled 
  on public.squidgy_agent_business_setup using btree (firm_user_id, is_enabled) TABLESPACE pg_default;

create index IF not exists idx_agent_setup_session_id 
  on public.squidgy_agent_business_setup using btree (session_id) TABLESPACE pg_default;

create index IF not exists idx_agent_setup_type 
  on public.squidgy_agent_business_setup using btree (setup_type) TABLESPACE pg_default;

-- Composite indexes for common queries
create index IF not exists idx_agent_setup_user_type 
  on public.squidgy_agent_business_setup using btree (firm_user_id, setup_type) TABLESPACE pg_default;

create index IF not exists idx_agent_setup_agent_type 
  on public.squidgy_agent_business_setup using btree (agent_id, setup_type) TABLESPACE pg_default;

create index IF not exists idx_agent_setup_user_agent 
  on public.squidgy_agent_business_setup using btree (firm_user_id, agent_id) TABLESPACE pg_default;

-- Specialized indexes for specific setup types
create index IF not exists idx_agent_setup_ghl 
  on public.squidgy_agent_business_setup using btree (firm_user_id, agent_id) TABLESPACE pg_default
  where ((setup_type)::text = 'GHLSetup'::text);

create index IF not exists idx_agent_setup_facebook 
  on public.squidgy_agent_business_setup using btree (firm_user_id, agent_id) TABLESPACE pg_default
  where ((setup_type)::text = 'FacebookIntegration'::text);

-- GoHighLevel specific indexes
create index IF not exists idx_agent_setup_ghl_location 
  on public.squidgy_agent_business_setup using btree (ghl_location_id) TABLESPACE pg_default;

create index IF not exists idx_agent_setup_ghl_user 
  on public.squidgy_agent_business_setup using btree (ghl_user_id) TABLESPACE pg_default;

create index IF not exists idx_agent_setup_ghl_credentials 
  on public.squidgy_agent_business_setup using btree (ghl_location_id, ghl_user_id) TABLESPACE pg_default;

-- ============================================================================
-- USERS FORGOT PASSWORD TABLE (Existing)
-- ============================================================================
create table public.users_forgot_password (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reset_token TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Index for password reset queries
create index IF not exists idx_forgot_password_token 
  on public.users_forgot_password using btree (reset_token) TABLESPACE pg_default;

create index IF not exists idx_forgot_password_user 
  on public.users_forgot_password using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_forgot_password_email 
  on public.users_forgot_password using btree (email) TABLESPACE pg_default;

-- ============================================================================
-- BUSINESS PROFILES TABLE (RESTORED)
-- ============================================================================
create table public.business_profiles (
  id uuid not null default gen_random_uuid(),
  firm_user_id uuid not null,
  firm_id uuid not null,
  business_name text null,
  business_email text null,
  phone text null,
  website text null,
  address text null,
  city text null,
  state text null,
  country text null default 'US'::text,
  postal_code text null,
  logo_url text null,
  screenshot_url text null,
  favicon_url text null,
  logo_storage_path text null,
  screenshot_storage_path text null,
  favicon_storage_path text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint business_profiles_pkey primary key (id),
  constraint business_profiles_firm_user_id_fkey foreign KEY (firm_user_id) references profiles (user_id) on delete CASCADE
) TABLESPACE pg_default;

-- Indexes for business_profiles
create index IF not exists idx_business_profiles_firm_user_id 
  on public.business_profiles using btree (firm_user_id) TABLESPACE pg_default;

create index IF not exists idx_business_profiles_business_email 
  on public.business_profiles using btree (business_email) TABLESPACE pg_default;

-- Function for updating updated_at timestamp (if not exists)
create or replace function update_business_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for auto-updating updated_at column
create trigger trigger_update_business_profiles_updated_at BEFORE
update on business_profiles for EACH row
execute FUNCTION update_business_profiles_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Enable RLS on agent business setup
ALTER TABLE public.squidgy_agent_business_setup ENABLE ROW LEVEL SECURITY;

-- Agent setup policies
CREATE POLICY "Users can view own agent setups" ON public.squidgy_agent_business_setup
  FOR SELECT USING (
    firm_user_id IN (
      SELECT user_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own agent setups" ON public.squidgy_agent_business_setup
  FOR INSERT WITH CHECK (
    firm_user_id IN (
      SELECT user_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own agent setups" ON public.squidgy_agent_business_setup
  FOR UPDATE USING (
    firm_user_id IN (
      SELECT user_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- NO RLS on business_profiles (as requested)
-- business_profiles table has no Row Level Security policies

-- Enable RLS on forgot password
ALTER TABLE public.users_forgot_password ENABLE ROW LEVEL SECURITY;

-- Forgot password policies
CREATE POLICY "Allow public to create password reset requests" ON public.users_forgot_password
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own password reset requests" ON public.users_forgot_password
  FOR SELECT USING (
    user_id IN (
      SELECT user_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- EXAMPLE DATA INSERTION QUERIES
-- ============================================================================

-- Example: Insert user profile with company_id
/*
INSERT INTO profiles (
  id,                    -- From Supabase auth.users.id
  user_id,              -- Generated UUID
  email,                -- User email
  full_name,            -- User name
  profile_avatar_url,   -- NULL initially
  company_id,           -- Generated UUID (serves as firm_id)
  role                  -- Default member
) VALUES (
  'auth-user-uuid-here',
  gen_random_uuid(),
  'user@example.com',
  'John Doe',
  NULL,
  gen_random_uuid(),    -- Simple UUID, no foreign key
  'member'
);
*/

-- Example: Insert default PersonalAssistant agent
/*
INSERT INTO squidgy_agent_business_setup (
  firm_id,              -- Same as profiles.company_id
  firm_user_id,         -- From profiles.user_id
  agent_id,             -- Agent identifier
  agent_name,           -- Display name
  setup_type,           -- Configuration type
  setup_json,           -- Agent capabilities
  is_enabled,           -- Active status
  session_id            -- Random session UUID
) VALUES (
  'company-uuid-here',
  'user-uuid-here',
  'PersonalAssistant',
  'Personal Assistant',
  'agent_config',
  '{"description": "Your general-purpose AI assistant", "capabilities": ["general_chat", "help", "information"]}'::JSONB,
  true,
  gen_random_uuid()
);
*/

-- Example: Insert business profile
/*
INSERT INTO business_profiles (
  firm_user_id,         -- From profiles.user_id
  business_name,        -- Required field
  business_email        -- Required field
) VALUES (
  'user-uuid-456',      -- Links to profiles.user_id
  'John Doe Business',  -- User's name as business name
  'user@example.com'    -- User's email as business email
);
*/

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. business_profiles table RESTORED with basic schema + firm_id field added
-- 2. avatar_url renamed to profile_avatar_url in profiles table
-- 3. company_id in profiles is the same as firm_id in business_profiles and agent setup
-- 4. All UUIDs are properly generated using gen_random_uuid()
-- 5. setup_type is 'agent_config' for default PersonalAssistant
-- 6. Basic indexes added for common queries
-- 7. business_profiles has NO RLS policies (full access)
-- 8. business_profiles has firm_user_id referencing profiles.user_id
-- 9. business_profiles includes: firm_id, firm_user_id, basic business info, logo/favicon URLs