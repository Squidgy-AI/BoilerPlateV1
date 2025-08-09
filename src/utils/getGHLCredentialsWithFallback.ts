// src/utils/getGHLCredentialsWithFallback.ts
'use client';

import { supabase } from '@/lib/supabase';
import { getUserId } from '@/utils/getUserId';

interface GHLCredentials {
  location_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  ghl_automation_email?: string;
  ghl_automation_password?: string;
  ghl_location_id?: string;
  ghl_user_id?: string;
}

interface GHLCredentialsResult {
  success: boolean;
  credentials?: GHLCredentials;
  error?: string;
}

const CACHE_KEY = 'ghl_credentials_cache';
const CACHE_EXPIRY_KEY = 'ghl_credentials_cache_expiry';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get GHL credentials with intelligent fallback and caching
 * 1. Check session cache first
 * 2. Try getGHLCredentials() utility
 * 3. Fallback to querying GHLSetup record directly
 * 4. Cache results for future use
 */
export async function getGHLCredentialsWithFallback(): Promise<GHLCredentialsResult> {
  try {
    // Step 1: Check cache first
    const cached = getCachedCredentials();
    if (cached) {
      console.log('✅ Using cached GHL credentials');
      return { success: true, credentials: cached };
    }

    // Step 2: Try the existing getGHLCredentials utility
    try {
      const { getGHLCredentials } = await import('@/utils/getGHLCredentials');
      const result = await getGHLCredentials();
      
      if (result.success && result.credentials) {
        // Ensure we have the ghl_location_id and ghl_user_id fields
        const enhancedCredentials: GHLCredentials = {
          user_name: 'Solar Business User', // Default values
          user_email: 'user@solarbusiness.com',
          ...result.credentials,
          ghl_location_id: result.credentials.location_id,
          ghl_user_id: result.credentials.user_id
        };
        
        setCachedCredentials(enhancedCredentials);
        console.log('✅ Got GHL credentials from utility function');
        return { success: true, credentials: enhancedCredentials };
      }
    } catch (error) {
      console.log('⚠️ getGHLCredentials utility failed, trying fallback method');
    }

    // Step 3: Fallback - query GHLSetup record directly
    const fallbackResult = await getGHLCredentialsFromSetup();
    if (fallbackResult.success && fallbackResult.credentials) {
      setCachedCredentials(fallbackResult.credentials);
      console.log('✅ Got GHL credentials from GHLSetup fallback');
      return fallbackResult;
    }

    return { success: false, error: 'No GHL credentials found in any source' };

  } catch (error) {
    console.error('❌ Error in getGHLCredentialsWithFallback:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get cached credentials from localStorage
 */
function getCachedCredentials(): GHLCredentials | null {
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);
    
    if (!cachedData || !cacheExpiry) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() > parseInt(cacheExpiry)) {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_EXPIRY_KEY);
      return null;
    }

    return JSON.parse(cachedData);
  } catch (error) {
    console.error('Error reading cached credentials:', error);
    return null;
  }
}

/**
 * Cache credentials in localStorage
 */
function setCachedCredentials(credentials: GHLCredentials): void {
  try {
    const expiryTime = Date.now() + CACHE_DURATION;
    localStorage.setItem(CACHE_KEY, JSON.stringify(credentials));
    localStorage.setItem(CACHE_EXPIRY_KEY, expiryTime.toString());
    console.log('💾 Cached GHL credentials for 5 minutes');
  } catch (error) {
    console.error('Error caching credentials:', error);
  }
}

/**
 * Fallback method: Query GHLSetup record directly from database
 */
async function getGHLCredentialsFromSetup(): Promise<GHLCredentialsResult> {
  try {
    const userIdResult = await getUserId();
    if (!userIdResult.success || !userIdResult.user_id) {
      return { success: false, error: 'Failed to get user ID' };
    }

    console.log('🔍 Querying GHLSetup record for credentials fallback...');
    
    // Query the database for GHLSetup record
    const { data, error } = await supabase
      .from('squidgy_agent_business_setup')
      .select('ghl_location_id, ghl_user_id, setup_json')
      .eq('firm_user_id', userIdResult.user_id)
      .eq('agent_id', 'SOLAgent')
      .eq('setup_type', 'GHLSetup')
      .single();

    if (error) {
      console.error('❌ Error querying GHLSetup record:', error);
      return { success: false, error: `Database error: ${error.message}` };
    }

    if (!data) {
      return { success: false, error: 'No GHLSetup record found' };
    }

    // Extract credentials from the record
    const ghl_location_id = data.ghl_location_id;
    const ghl_user_id = data.ghl_user_id;
    
    // Try to get additional info from setup_json if available
    let additionalInfo = {};
    if (data.setup_json && typeof data.setup_json === 'object') {
      const setupJson = data.setup_json as any;
      additionalInfo = {
        user_name: setupJson.user_name || 'Solar Business User',
        user_email: setupJson.user_email || setupJson.ghl_automation_email || 'user@solarbusiness.com',
        ghl_automation_email: setupJson.ghl_automation_email,
        ghl_automation_password: setupJson.ghl_automation_password
      };
    }

    if (!ghl_location_id || !ghl_user_id) {
      return { success: false, error: 'GHL location_id or user_id not found in setup record' };
    }

    const credentials: GHLCredentials = {
      location_id: ghl_location_id,
      user_id: ghl_user_id,
      ghl_location_id,
      ghl_user_id,
      user_name: 'Solar Business User',
      user_email: 'user@solarbusiness.com',
      ...additionalInfo
    };

    console.log('✅ Successfully extracted GHL credentials from setup record');
    return { success: true, credentials };

  } catch (error) {
    console.error('❌ Error in getGHLCredentialsFromSetup:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Clear the credentials cache (useful for logout or manual refresh)
 */
export function clearGHLCredentialsCache(): void {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_EXPIRY_KEY);
  console.log('🗑️ Cleared GHL credentials cache');
}

/**
 * Force refresh credentials (clear cache and fetch fresh)
 */
export async function refreshGHLCredentials(): Promise<GHLCredentialsResult> {
  clearGHLCredentialsCache();
  return getGHLCredentialsWithFallback();
}