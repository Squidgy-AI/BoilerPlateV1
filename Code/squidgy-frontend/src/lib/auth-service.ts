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
        if (authError.message.includes('rate limit')) {
          throw new Error('Too many signup attempts. Please wait a few minutes and try again.');
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

      // Create profile record
      const profileData = {
        id: authData.user.id,
        user_id: uuidv4(),
        email: userData.email.toLowerCase(),
        full_name: userData.fullName.trim(),
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

      // Check if user exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, email')
        .eq('email', data.email.toLowerCase())
        .single();

      if (profileError || !profile) {
        // Don't reveal if email exists or not for security
        return { message: 'If an account with this email exists, you will receive a password reset link' };
      }

      // Generate reset token
      const resetToken = uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

      // Store reset token in database
      const { error: tokenError } = await supabase
        .from('users_forgot_password')
        .insert([{
          user_id: profile.user_id,
          email: data.email.toLowerCase(),
          reset_token: resetToken,
          token_expires_at: expiresAt.toISOString(),
          is_used: false
        }]);

      if (tokenError) {
        throw tokenError;
      }

      // Send reset email using Supabase Auth with custom SMTP
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/reset-password?token=${resetToken}`
        : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        data.email.toLowerCase(),
        {
          redirectTo: redirectUrl,
          captchaToken: undefined // Skip captcha for now
        }
      );

      if (resetError) {
        throw resetError;
      }

      return { message: 'Password reset link sent to your email' };

    } catch (error: any) {
      console.error('Password reset error:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  // Reset password with token
  async resetPassword(data: ResetPasswordData): Promise<{ message: string }> {
    try {
      // Validate new password
      if (!this.isValidPassword(data.newPassword)) {
        throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number');
      }

      // Verify reset token
      const { data: resetRecord, error: tokenError } = await supabase
        .from('users_forgot_password')
        .select('*')
        .eq('reset_token', data.token)
        .eq('is_used', false)
        .single();

      if (tokenError || !resetRecord) {
        throw new Error('Invalid or expired reset token');
      }

      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(resetRecord.token_expires_at);
      if (now > expiresAt) {
        throw new Error('Reset token has expired');
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', resetRecord.user_id)
        .single();

      if (profileError || !profile) {
        throw new Error('User not found');
      }

      // Update password using Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (updateError) {
        throw updateError;
      }

      // Mark token as used
      const { error: markUsedError } = await supabase
        .from('users_forgot_password')
        .update({
          is_used: true,
          used_at: new Date().toISOString()
        })
        .eq('id', resetRecord.id);

      if (markUsedError) {
        console.error('Failed to mark token as used:', markUsedError);
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