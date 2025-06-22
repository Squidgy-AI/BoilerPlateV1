// src/components/Auth/AuthProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Provider, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase';
import { authService } from '@/lib/auth-service';

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

  // Fetch user profile from database with timeout
  const fetchProfile = async (userId: string) => {
    try {
      console.log(`Fetching profile for user: ${userId}`);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      console.log('Profile fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let authSubscription: { unsubscribe: () => void } | null = null;

    // Helper function to wrap getSession with timeout
    const getSessionWithTimeout = async (timeoutMs: number = 5000) => {
      return Promise.race([
        supabase.auth.getSession(),
        new Promise<{ data: { session: null }, error: { message: string } }>((_, reject) =>
          setTimeout(() => reject(new Error('getSession timeout')), timeoutMs)
        )
      ]);
    };

    const initAuth = async () => {
      try {
        setIsLoading(true);
        
        // Safety timeout - force loading to end after 5 seconds total
        timeoutId = setTimeout(() => {
          console.warn('Auth initialization timeout - forcing loading to complete');
          setIsLoading(false);
        }, 5000);
        
        console.log('Starting auth initialization...');
        
        // Immediate session check with 3-second timeout
        let sessionResult;
        try {
          sessionResult = await getSessionWithTimeout(3000);
          console.log('getSession completed successfully');
        } catch (error) {
          console.warn('getSession timed out or failed, assuming no session:', error);
          sessionResult = { data: { session: null }, error: null };
        }
        
        const { data: { session: currentSession }, error } = sessionResult;
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        setSession(currentSession);
        
        if (currentSession?.user) {
          setUser(currentSession.user);
          console.log('User found, auth initialization complete');
          
          // Don't wait for profile - fetch it in background
          fetchProfile(currentSession.user.id)
            .then(profileData => {
              setProfile(profileData);
              console.log('Profile loaded in background');
            })
            .catch(profileError => {
              console.warn('Background profile fetch failed:', profileError);
              setProfile(null);
            });
        } else {
          console.log('No session found');
        }
        
        // Clear timeout and stop loading immediately - don't wait for profile
        clearTimeout(timeoutId);
        setIsLoading(false);
        console.log('Auth initialization completed (profile loading in background)');
        
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };
    
    // Start initialization
    initAuth();
    
    // Listen for auth state changes (but don't set loading state here)
    const setupAuthListener = async () => {
      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, updatedSession) => {
            console.log('Auth state change:', event, updatedSession?.user?.id);
            setSession(updatedSession);
            setUser(updatedSession?.user || null);
            
            if (updatedSession?.user) {
              // Fetch or create profile in background - don't block auth state updates
              fetchProfile(updatedSession.user.id)
                .then(async (profileData) => {
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
                      console.log('Profile created successfully:', profileData);
                    } catch (error) {
                      console.error('Error creating profile:', error);
                    }
                  }
                  
                  setProfile(profileData);
                  console.log('Profile set in auth listener');
                })
                .catch(profileError => {
                  console.warn('Profile operations failed in auth listener:', profileError);
                  setProfile(null);
                });
            } else {
              setProfile(null);
            }
          }
        );
        
        authSubscription = subscription;
      } catch (error) {
        console.error('Error setting up auth listener:', error);
      }
    };
    
    setupAuthListener();
    
    return () => {
      // Cleanup timeout and subscription
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  // Sign in with provider (email, google, etc.)
  const signIn = async (provider: string, credentials?: { email?: string; password?: string }) => {
    try {
      if (provider === 'email') {
        if (!credentials?.email || !credentials.password) {
          throw new Error('Email and password are required');
        }
        
        const result = await authService.signIn({
          email: credentials.email,
          password: credentials.password,
        });
        
        // Update local state
        setUser(result.user);
        setProfile(result.profile);
        
      } else if (['google', 'apple', 'github', 'whatsapp'].includes(provider)) {
        // Handle whatsapp special case
        if (provider === 'whatsapp') {
          throw new Error('WhatsApp login is not yet implemented');
        }
        
        const result = await supabase.auth.signInWithOAuth({
          provider: provider as Provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        
        if (result.error) throw result.error;
      } else {
        throw new Error(`Unsupported sign-in method: ${provider}`);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Sign-in failed');
    }
  };

  // Sign up with email and password
  const signUp = async ({ email, password, fullName }: { email: string; password: string; fullName: string }) => {
    try {
      const result = await authService.signUp({ email, password, fullName });
      
      // Update local state
      setUser(result.user);
      setProfile(result.profile);
      
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
      await authService.sendPasswordResetEmail({ email });
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
        .select('user_id, email')
        .eq('email', email)
        .limit(1);
      
      // Generate a token for the invitation
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Create invitation
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          sender_id: profile?.user_id,
          recipient_id: existingUsers && existingUsers.length > 0 ? existingUsers[0].user_id : null,
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
      
      // Send invitation email using Supabase Auth
      const inviteUrl = `${window.location.origin}/invite/${token}`;
      
      try {
        console.log('Attempting to send invitation email to:', email);
        console.log('Invitation URL:', inviteUrl);
        
        // Send invitation email through API route (which has admin access)
        const emailResponse = await fetch('/api/send-invitation-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            token,
            senderName: profile?.full_name || user?.email,
            inviteUrl
          })
        });
        
        console.log('Email API response status:', emailResponse.status);
        
        if (!emailResponse.ok) {
          console.error('Email API request failed with status:', emailResponse.status);
          const errorText = await emailResponse.text();
          console.error('Error response:', errorText);
          throw new Error(`Email API failed: ${emailResponse.status}`);
        }
        
        const emailResult = await emailResponse.json();
        console.log('Email API result:', emailResult);
        
        if (emailResult.success) {
          return {
            status: 'success',
            message: `Invitation email sent to ${email}`
          };
        } else {
          console.warn('Email sending failed:', emailResult.error);
          console.warn('Email error details:', emailResult.details);
          
          // If we have a fallback URL, show it to the user
          if (emailResult.fallback_url) {
            return {
              status: 'partial_success',
              message: `Invitation created for ${email}. Please share this link manually:`,
              invitation_link: emailResult.fallback_url,
              error_details: emailResult.error
            };
          }
          
          return {
            status: 'success',
            message: `Invitation created for ${email}. Email failed: ${emailResult.error}. Manual link: ${inviteUrl}`
          };
        }
      } catch (emailError) {
        console.error('Frontend email API failed, trying backend...', emailError);
        
        // Try backend as fallback
        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
          const backendResponse = await fetch(`${backendUrl}/api/send-invitation-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              token,
              senderName: profile?.full_name || user?.email,
              inviteUrl
            })
          });
          
          const backendResult = await backendResponse.json();
          console.log('Backend email result:', backendResult);
          
          if (backendResult.fallback_url) {
            return {
              status: 'partial_success',
              message: `Invitation created for ${email}. Please share this link manually:`,
              invitation_link: backendResult.fallback_url,
              error_details: 'Email automation not configured'
            };
          }
          
        } catch (backendError) {
          console.error('Backend email also failed:', backendError);
        }
        
        return {
          status: 'success',
          message: `Invitation created for ${email}. Email automation unavailable. Share this link: ${inviteUrl}`
        };
      }
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