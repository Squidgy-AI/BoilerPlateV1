// src/hooks/useFacebookUnlockStatus.tsx
'use client';

import { useState, useEffect } from 'react';
import { getUserId } from '@/utils/getUserId';

interface FacebookUnlockStatus {
  facebook_unlocked: boolean;
  reason: 'no_business_setup' | 'setup_not_completed' | 'setup_completed' | 'unlock_expired' | 'time_calculation_error';
  message: string;
  setup_status: string | null;
  time_remaining: number | null;
  expires_at?: string;
}

interface UseFacebookUnlockReturn {
  status: FacebookUnlockStatus | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useFacebookUnlockStatus = (firmUserId?: string): UseFacebookUnlockReturn => {
  const [status, setStatus] = useState<FacebookUnlockStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let userId = firmUserId;
      if (!userId) {
        const userIdResult = await getUserId();
        if (!userIdResult.success || !userIdResult.user_id) {
          throw new Error('User ID not found');
        }
        userId = userIdResult.user_id;
      }
      
      if (!userId) {
        throw new Error('User ID not found');
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/business/facebook-status/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setStatus(result);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check Facebook unlock status';
      setError(errorMessage);
      console.error('Facebook unlock status error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [firmUserId]);

  // Auto-refresh to detect unlock status changes and update timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (status?.facebook_unlocked && status.time_remaining && status.time_remaining > 0) {
      // If unlocked, refresh every minute to update timer
      interval = setInterval(fetchStatus, 60000);
    } else if (status && !status.facebook_unlocked && status.reason === 'setup_not_completed') {
      // If locked due to incomplete setup, check more frequently (every 30 seconds)
      // This enables real-time unlock detection when setup completes
      console.log('🔄 Facebook locked - checking every 30 seconds for setup completion...');
      interval = setInterval(fetchStatus, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  return {
    status,
    isLoading,
    error,
    refetch: fetchStatus
  };
};