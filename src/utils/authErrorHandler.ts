// src/utils/authErrorHandler.ts
// Utility to handle authentication errors consistently across the app

import { supabase } from '@/lib/supabase';

export const isAuthError = (error: any): boolean => {
  if (!error) return false;
  
  const errorMessage = error.message || '';
  return (
    errorMessage.includes('Refresh Token') ||
    errorMessage.includes('Invalid Refresh Token') ||
    errorMessage.includes('JWT') ||
    errorMessage.includes('expired') ||
    errorMessage.includes('unauthorized') ||
    error.status === 401
  );
};

export const handleAuthError = async (error: any): Promise<void> => {
  if (!isAuthError(error)) return;
  
  console.warn('Auth error detected, clearing session:', error.message);
  
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear any auth-related localStorage data
    const authKeys = [
      'supabase.auth.token',
      'sb-aoteeitreschwzkbpqyd-auth-token',
      'solarBusinessConfig',
      'calendarSetup',
      'notificationPreferences'
    ];
    
    authKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Ignore localStorage errors
      }
    });
    
    // Reload the page to reset the app state
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  } catch (signOutError) {
    console.error('Error during auth cleanup:', signOutError);
  }
};

export const withAuthErrorHandling = async <T>(
  operation: () => Promise<T>
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    if (isAuthError(error)) {
      await handleAuthError(error);
      return null;
    }
    throw error;
  }
};