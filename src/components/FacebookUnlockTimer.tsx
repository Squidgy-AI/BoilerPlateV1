// src/components/FacebookUnlockTimer.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Lock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useFacebookUnlockStatus } from '@/hooks/useFacebookUnlockStatus';

interface FacebookUnlockTimerProps {
  firmUserId?: string;
  onUnlockStatusChange?: (unlocked: boolean) => void;
}

const FacebookUnlockTimer: React.FC<FacebookUnlockTimerProps> = ({
  firmUserId,
  onUnlockStatusChange
}) => {
  const { status, isLoading, error, refetch } = useFacebookUnlockStatus(firmUserId);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // Convert minutes to seconds for more precise countdown
  useEffect(() => {
    if (status?.time_remaining) {
      setSecondsRemaining(status.time_remaining * 60);
    }
  }, [status?.time_remaining]);

  // Countdown timer (updates every second)
  useEffect(() => {
    if (!status?.facebook_unlocked || !secondsRemaining || secondsRemaining <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (!prev || prev <= 1) {
          // Timer expired, refetch status
          refetch();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status?.facebook_unlocked, secondsRemaining, refetch]);

  // Notify parent component of unlock status changes
  useEffect(() => {
    if (onUnlockStatusChange && status) {
      onUnlockStatusChange(status.facebook_unlocked);
    }
  }, [status?.facebook_unlocked, onUnlockStatusChange]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-gray-600">
        <Clock className="animate-spin w-4 h-4" />
        <span className="text-sm">Checking Facebook access...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm">Error checking Facebook status</span>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const getStatusIcon = () => {
    if (status.facebook_unlocked) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <Lock className="w-4 h-4 text-red-500" />;
  };

  const getStatusColor = () => {
    if (status.facebook_unlocked) {
      // Show urgency colors based on time remaining
      if (secondsRemaining && secondsRemaining < 300) return 'text-red-600'; // Last 5 minutes
      if (secondsRemaining && secondsRemaining < 600) return 'text-orange-600'; // Last 10 minutes
      return 'text-green-600';
    }
    return 'text-gray-600';
  };

  return (
    <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
      {getStatusIcon()}
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {status.facebook_unlocked ? 'Facebook Unlocked' : 'Facebook Locked'}
        </span>
        {status.facebook_unlocked && secondsRemaining && secondsRemaining > 0 && (
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span className="text-xs font-mono">
              {formatTime(secondsRemaining)} remaining
            </span>
          </div>
        )}
        <span className="text-xs text-gray-500 max-w-xs">
          {status.message}
        </span>
      </div>
    </div>
  );
};

export default FacebookUnlockTimer;