import { supabase } from '../lib/supabase';

export enum ActivityType {
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  PASSWORD_RESET_COMPLETE = 'PASSWORD_RESET_COMPLETE',
  SETTINGS_UPDATE = 'SETTINGS_UPDATE',
  AVATAR_INITIALIZED = 'AVATAR_INITIALIZED',
  AVATAR_ENABLED = 'AVATAR_ENABLED',
  AVATAR_DISABLED = 'AVATAR_DISABLED',
  AVATAR_INTERACTION = 'AVATAR_INTERACTION'
}

export interface ActivityData {
  user_id?: string;
  action: ActivityType;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Tracks user activity in the activity_logs table
 * @param data Activity data to track
 * @returns Object with success status and data
 */
export const trackActivity = async (data: ActivityData) => {
  try {
    if (!data.user_id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        data.user_id = user.id;
      }
    }

    const details = { 
      ...data.details, 
      ip_address: data.ip_address, 
      user_agent: data.user_agent, 
      timestamp: new Date().toISOString() 
    };

    if (!data.user_id) {
      console.log('%c📝 ACTIVITY TRACKER: Anonymous activity tracked (not saved to DB)', 'background: #333; color: #bada55; padding: 2px; border-radius: 2px;');
      console.log('%c→ Action:', 'color: #ff9800; font-weight: bold;', data.action);
      console.log('%c→ Details:', 'color: #2196f3; font-weight: bold;', details);
      
      try {
        if (typeof window !== 'undefined') {
          const pendingActivities = JSON.parse(localStorage.getItem('pendingActivities') || '[]');
          pendingActivities.push({ 
            action: data.action, 
            details: details, 
            timestamp: new Date().toISOString() 
          });
          localStorage.setItem('pendingActivities', JSON.stringify(pendingActivities));
        }
      } catch (e) {
        console.warn('Could not store pending activity in localStorage', e);
      }
      
      return { success: true, anonymous: true, data: null };
    }

    try {
      const { data: result, error } = await supabase
        .from('activity_logs')
        .insert({ 
          user_id: data.user_id, 
          action: data.action, 
          details: details 
        });

      if (error) {
        if (error.code === '23502' && error.message?.includes('violates not-null constraint')) {
          console.warn('User ID is required for activity logs. Attempting to retry with current user.');
          
          // Try again with current user
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: retryResult, error: retryError } = await supabase
              .from('activity_logs')
              .insert({ 
                user_id: user.id, 
                action: data.action, 
                details: details 
              });
              
            if (retryError) {
              console.error('Failed to track activity after retry:', retryError);
              return { success: false, error: retryError };
            }
            
            console.log('%c✅ ACTIVITY TRACKER: Activity tracked successfully (with retry)', 'background: #333; color: #4caf50; padding: 2px; border-radius: 2px;');
            console.log('%c→ Action:', 'color: #4caf50; font-weight: bold;', data.action);
            console.log('%c→ User ID:', 'color: #4caf50; font-weight: bold;', user.id);
            
            return { success: true, data: retryResult };
          } else {
            console.warn('No authenticated user found for activity tracking');
            return { success: false, error: new Error('No authenticated user found') };
          }
        }
        
        console.error('Failed to track activity:', error);
        return { success: false, error };
      }
      
      console.log('%c✅ ACTIVITY TRACKER: Activity tracked successfully', 'background: #333; color: #4caf50; padding: 2px; border-radius: 2px;');
      console.log('%c→ Action:', 'color: #4caf50; font-weight: bold;', data.action);
      console.log('%c→ User ID:', 'color: #4caf50; font-weight: bold;', data.user_id);
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Error in activity tracking:', error);
      return { success: false, error };
    }
  } catch (error) {
    console.error('Unexpected error in activity tracking:', error);
    return { success: false, error };
  }
};
