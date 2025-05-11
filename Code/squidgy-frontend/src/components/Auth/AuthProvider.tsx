// src/components/Auth/AuthProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Provider, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (provider: string, credentials?: { email?: string; password?: string }) => Promise<void>;
  signUp: (credentials: { email: string; password: string; fullName: string }) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  inviteUser: (email: string, groupId?: string) => Promise<{ status: string; message?: string }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from database
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      // Get current session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      
      if (currentSession?.user) {
        setUser(currentSession.user);
        
        // Fetch user profile
        const profileData = await fetchProfile(currentSession.user.id);
        setProfile(profileData);
      }
      
      setIsLoading(false);
    };
    
    initAuth();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, updatedSession) => {
        setSession(updatedSession);
        setUser(updatedSession?.user || null);
        
        if (updatedSession?.user) {
          // Fetch or create profile
          let profileData = await fetchProfile(updatedSession.user.id);
          
          // If no profile exists and we have a new sign-up, create one
          if (!profileData && event === 'SIGNED_IN') {
            try {
              const fullName = updatedSession.user.user_metadata?.full_name || 
                               updatedSession.user.user_metadata?.name || 
                               updatedSession.user.email?.split('@')[0] || 
                               'User';
              
              const { data, error } = await supabase
                .from('profiles')
                .insert({
                  id: updatedSession.user.id,
                  email: updatedSession.user.email,
                  full_name: fullName,
                  avatar_url: updatedSession.user.user_metadata?.avatar_url || null
                })
                .select()
                .single();
                
              if (error) throw error;
              profileData = data;
            } catch (error) {
              console.error('Error creating profile:', error);
            }
          }
          
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in with provider (email, google, etc.)
  const signIn = async (provider: string, credentials?: { email?: string; password?: string }) => {
    try {
      let result;
      
      if (provider === 'email') {
        if (!credentials?.email || !credentials.password) {
          throw new Error('Email and password are required');
        }
        
        result = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });
      } else if (['google', 'apple', 'github', 'whatsapp'].includes(provider)) {
        // Handle whatsapp special case
        if (provider === 'whatsapp') {
          throw new Error('WhatsApp login is not yet implemented');
        }
        
        result = await supabase.auth.signInWithOAuth({
          provider: provider as Provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
      } else {
        throw new Error(`Unsupported sign-in method: ${provider}`);
      }
      
      if (result.error) throw result.error;
    } catch (error: any) {
      throw new Error(error.message || 'Sign-in failed');
    }
  };

  // Sign up with email and password
  const signUp = async ({ email, password, fullName }: { email: string; password: string; fullName: string }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      
      if (error) throw error;
      
      // Profile will be created by the database trigger or onAuthStateChange handler
    } catch (error: any) {
      throw new Error(error.message || 'Sign-up failed');
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      throw new Error(error.message || 'Sign-out failed');
    }
  };

  // Send password reset email
  const sendPasswordResetEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) throw error;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send reset email');
    }
  };

  // Refresh profile data
  // Make sure this function exists in your AuthProvider.tsx
  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      
      setProfile(data);
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  };

  // Invite a user
  const inviteUser = async (email: string, groupId?: string) => {
    try {
      // Check if there's already a user with this email
      const { data: existingUsers } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .limit(1);
      
      // Generate a token for the invitation
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Create invitation
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          sender_id: user?.id,
          recipient_id: existingUsers && existingUsers.length > 0 ? existingUsers[0].id : null,
          recipient_email: email,
          group_id: groupId,
          company_id: profile?.company_id,
          token,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // In a real app, you'd send an email with the invitation link
      // For now, just return the token
      return {
        status: 'success',
        message: `Invitation sent to ${email}`
      };
    } catch (error: any) {
      console.error('Failed to invite user:', error);
      return {
        status: 'error',
        message: error.message || 'Failed to invite user'
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isLoading,
        signIn,
        signUp,
        signOut,
        sendPasswordResetEmail,
        refreshProfile,
        inviteUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};