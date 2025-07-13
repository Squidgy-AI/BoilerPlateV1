// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables:', {
    NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!supabaseAnonKey
  });
  throw new Error('Missing required Supabase environment variables. Please check your .env.local file.');
}

// Log Supabase configuration for debugging
console.log('🔧 Supabase client configuration:', {
  url: supabaseUrl,
  anonKeyPrefix: supabaseAnonKey.substring(0, 20) + '...',
  isClient: typeof window !== 'undefined'
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,     // ✅ Enable automatic token refresh
    persistSession: true,       // ✅ Persist sessions across browser refreshes
    detectSessionInUrl: true,   // ✅ Handle auth redirects from OAuth providers
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce'
  },
  realtime: {
    headers: {
      apikey: supabaseAnonKey,
    },
  },
});

// Custom types for Supabase tables
export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  company_id?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  company_id?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  is_agent: boolean;
  agent_type?: string;
  created_at?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  message_type?: string;
  is_read?: boolean;
  timestamp: string;
  sender?: Profile;
  recipient?: Profile;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  message: string;
  message_type?: string;
  is_agent?: boolean;
  agent_type?: string;
  timestamp: string;
  sender?: Profile;
}

export interface Session {
  id: string;
  user_id: string;
  is_group: boolean;
  group_id?: string;
  agent_id?: string;
  created_at: string;
  last_active: string;
}

export interface ForgotPassword {
  id: string;
  user_id: string;
  email: string;
  reset_token: string;
  token_expires_at: string;
  is_used: boolean;
  created_at: string;
  used_at?: string;
}

export interface Invitation {
  id: string;
  sender_id: string; // References profiles.user_id
  recipient_id?: string; // References profiles.user_id
  recipient_email: string;
  company_id?: string;
  group_id?: string;
  status: 'pending' | 'accepted' | 'declined';
  token: string;
  created_at: string;
  expires_at: string;
  sender?: Profile; // Populated via join
  recipient?: Profile; // Populated via join
}

export default supabase;