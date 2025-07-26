// src/lib/auth-service.ts
import { supabase } from './supabase';
import { Profile, ForgotPassword } from './supabase';
import { v4 as uuidv4 } from 'uuid';

interface SignUpData {
  email: string;
  password: string;
  fullName: string;
}

interface SignInData {
  email: string;
  password: string;
}

interface ForgotPasswordData {
  email: string;
}

interface ResetPasswordData {
  token: string;
  newPassword: string;
}

export class AuthService {
  
  // Email validation helper
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Password validation helper
  private isValidPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }


  // Sign up user
  async signUp(userData: SignUpData): Promise<{ user: any; profile: Profile }> {
    try {
      // Validate input
      if (!this.isValidEmail(userData.email)) {
        throw new Error('Please enter a valid email address');
      }

      if (!this.isValidPassword(userData.password)) {
        throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number');
      }

      if (!userData.fullName || userData.fullName.trim().length < 2) {
        throw new Error('Full name must be at least 2 characters');
      }

      // Note: Email uniqueness will be handled by Supabase auth and database constraints

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email.toLowerCase(),
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName.trim(),
          }
        }
      });

      if (authError) {
        // Handle specific error cases
        if (authError.message.includes('rate limit') || 
            authError.message.includes('too many requests') ||
            authError.message.includes('429')) {
          throw new Error('Too many attempts. Please wait 5-10 minutes and try again. If this persists, the rate limits may need to be adjusted in Supabase dashboard.');
        }
        if (authError.message.includes('already registered') || 
            authError.message.includes('already been registered')) {
          throw new Error('An account with this email already exists. Please try logging in instead.');
        }
        if (authError.message.includes('invalid email')) {
          throw new Error('Please enter a valid email address.');
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Create profile record with company_id (firm_id)
      const companyId = crypto.randomUUID(); // Generate company/firm ID
      const profileData = {
        id: authData.user.id,
        user_id: uuidv4(),
        email: userData.email.toLowerCase(),
        full_name: userData.fullName.trim(),
        profile_avatar_url: null, // Updated field name
        company_id: companyId, // This serves as firm_id
        role: 'member'
      };

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation failed:', profileError);
        // Clean up auth user if profile creation fails
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError);
        }
        
        // Handle specific profile errors
        if (profileError.message.includes('duplicate key') || 
            profileError.message.includes('unique constraint')) {
          throw new Error('An account with this email already exists. Please try logging in instead.');
        }
        throw new Error('Failed to create user profile. Please try again.');
      }

      // Create business_profiles record automatically (using UPSERT)
      try {
        const { error: businessProfileError } = await supabase
          .from('business_profiles')
          .upsert({
            firm_user_id: profile.user_id, // Use the profile's user_id (UUID)
            firm_id: companyId // Same as profiles.company_id
          }, {
            onConflict: 'firm_user_id'
          });

        if (businessProfileError) {
          console.error('Business profile creation failed:', businessProfileError);
          // Don't fail the entire signup process, but log the error
          console.warn('User profile created successfully, but business profile creation failed');
        } else {
          console.log('✅ Business profile record created automatically for new user');
        }
      } catch (businessProfileCreationError) {
        console.error('Error creating business profile:', businessProfileCreationError);
        // Don't fail the signup process
      }

      // Create PersonalAssistant agent record automatically
      try {
        const sessionId = crypto.randomUUID(); // Session tracking
        
        const personalAssistantConfig = {
          description: "Your general-purpose AI assistant",
          capabilities: ["general_chat", "help", "information"]
        };

        const { error: agentError } = await supabase
          .from('squidgy_agent_business_setup')
          .insert({
            firm_id: companyId, // Use same company_id from profile
            firm_user_id: profile.user_id, // References profiles.user_id
            agent_id: 'PersonalAssistant',
            agent_name: 'Personal Assistant',
            setup_type: 'agent_config',
            setup_json: personalAssistantConfig,
            is_enabled: true,
            session_id: sessionId
          });

        if (agentError) {
          console.error('PersonalAssistant agent creation failed:', agentError);
          // Don't fail the entire signup process, but log the error
          console.warn('User profile created successfully, but PersonalAssistant agent creation failed');
        } else {
          console.log('✅ PersonalAssistant agent created automatically for new user');
        }
      } catch (agentCreationError) {
        console.error('Error creating PersonalAssistant agent:', agentCreationError);
        // Don't fail the signup process
      }

      return {
        user: authData.user,
        profile: profile
      };

    } catch (error: any) {
      console.error('Signup error:', error);
      throw new Error(error.message || 'Failed to create account');
    }
  }

  // Sign in user
  async signIn(credentials: SignInData): Promise<{ user: any; profile: Profile }> {
    try {
      // Validate input
      if (!this.isValidEmail(credentials.email)) {
        throw new Error('Please enter a valid email address');
      }

      if (!credentials.password) {
        throw new Error('Password is required');
      }

      // Attempt sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email.toLowerCase(),
        password: credentials.password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password');
        }
        if (authError.message.includes('rate limit') || 
            authError.message.includes('too many requests') ||
            authError.message.includes('429')) {
          throw new Error('Too many login attempts. Please wait 5-10 minutes and try again.');
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to sign in');
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        throw new Error('Failed to load user profile');
      }

      return {
        user: authData.user,
        profile: profile
      };

    } catch (error: any) {
      console.error('Signin error:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(data: ForgotPasswordData): Promise<{ message: string }> {
    try {
      // Validate email
      if (!this.isValidEmail(data.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Check if user exists in profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', data.email.toLowerCase())
        .single();

      if (profileError || !profile) {
        // For security reasons, don't reveal whether the email exists or not
        // Always return success message to prevent email enumeration
        console.log(`Password reset attempted for non-existent email: ${data.email}`);
        return { message: 'If an account exists with this email, a password reset link has been sent.' };
      }

      // Use Supabase Auth's built-in password reset
      // This handles everything including email sending
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/reset-password`
        : `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://boiler-plate-v1-lake.vercel.app'}/auth/reset-password`;
        
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        data.email.toLowerCase(),
        {
          redirectTo: redirectUrl,
        }
      );

      if (resetError) {
        console.error('Reset password error:', resetError);
        throw new Error(resetError.message || 'Failed to send password reset email');
      }

      return { message: 'If an account exists with this email, a password reset link has been sent.' };

    } catch (error: any) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  // Reset password with token
  async resetPassword(data: ResetPasswordData): Promise<{ message: string }> {
    try {
      // Validate new password
      if (!this.isValidPassword(data.newPassword)) {
        throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number');
      }

      // When using Supabase's built-in password reset flow,
      // the user should already be authenticated via the magic link
      // Just update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (updateError) {
        throw updateError;
      }

      return { message: 'Password reset successfully' };

    } catch (error: any) {
      console.error('Password reset error:', error);
      throw new Error(error.message || 'Failed to reset password');
    }
  }

  // Sign out user
  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Signout error:', error);
      throw new Error('Failed to sign out');
    }
  }

  // Get current user session
  async getCurrentUser(): Promise<{ user: any; profile: Profile | null }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw userError;
      }

      if (!user) {
        return { user: null, profile: null };
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Failed to load profile:', profileError);
        return { user, profile: null };
      }

      return { user, profile };

    } catch (error: any) {
      console.error('Get current user error:', error);
      return { user: null, profile: null };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();