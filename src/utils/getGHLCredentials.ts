// src/utils/getGHLCredentials.ts
import { supabase } from '@/lib/supabase';
import { getUserId } from './getUserId';

export interface GHLCredentials {
  location_id: string;
  user_id: string;
}

/**
 * Get GHL credentials from the database for the current user
 * Returns the location_id and user_id from the GHL setup
 */
export async function getGHLCredentials(): Promise<{ 
  success: boolean; 
  credentials?: GHLCredentials; 
  error?: string 
}> {
  try {
    const userIdResult = await getUserId();
    if (!userIdResult.success || !userIdResult.user_id) {
      return { success: false, error: 'Failed to get user ID' };
    }

    // Query the GHL setup record to get credentials
    const { data, error } = await supabase
      .from('squidgy_agent_business_setup')
      .select('setup_json')
      .eq('firm_user_id', userIdResult.user_id)
      .eq('agent_id', 'SOLAgent')
      .eq('setup_type', 'GHLSetup')
      .eq('is_enabled', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'GHL setup not found - please complete GHL setup first' };
      }
      return { success: false, error: `Database error: ${error.message}` };
    }

    if (!data?.setup_json) {
      return { success: false, error: 'GHL setup data is empty' };
    }

    const ghlConfig = data.setup_json as any;
    
    if (!ghlConfig.location_id || !ghlConfig.user_id) {
      return { 
        success: false, 
        error: 'GHL credentials incomplete - missing location_id or user_id' 
      };
    }

    return {
      success: true,
      credentials: {
        location_id: ghlConfig.location_id,
        user_id: ghlConfig.user_id
      }
    };
  } catch (error) {
    console.error('Failed to get GHL credentials:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}