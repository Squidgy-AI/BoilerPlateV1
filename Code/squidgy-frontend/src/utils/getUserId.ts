// src/utils/getUserId.ts
// Centralized utility to get the correct user_id from profiles table

import { supabase } from '@/lib/supabase';
import { handleAuthError, isAuthError } from './authErrorHandler';

export interface UserIdResult {
  success: boolean;
  user_id?: string;
  auth_user_id?: string;
  error?: string;
}

/**
 * Get the correct user_id from profiles table for database operations
 * This ensures consistency across all database foreign key references
 */
export const getUserId = async (): Promise<UserIdResult> => {
  try {
    // Get auth user first
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      // Handle refresh token errors
      if (isAuthError(authError)) {
        await handleAuthError(authError);
      }
      return {
        success: false,
        error: authError.message || 'Authentication error'
      };
    }
    
    if (!user) {
      return {
        success: false,
        error: 'No authenticated user'
      };
    }

    // Get the profile to get the correct user_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      return {
        success: false,
        auth_user_id: user.id,
        error: 'Failed to get user profile'
      };
    }

    return {
      success: true,
      user_id: profile.user_id,
      auth_user_id: user.id
    };
  } catch (error) {
    // Handle any unexpected auth errors
    if (isAuthError(error)) {
      await handleAuthError(error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Simplified version that throws on error for use in contexts where error handling is done elsewhere
 */
export const getUserIdOrThrow = async (): Promise<string> => {
  const result = await getUserId();
  
  if (!result.success || !result.user_id) {
    throw new Error(result.error || 'Failed to get user ID');
  }
  
  return result.user_id;
};

export default getUserId;