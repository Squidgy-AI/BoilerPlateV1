'use client';

import React, { useState, useEffect } from 'react';
import { Mail, X, Clock } from 'lucide-react';
import { useAuth } from './Auth/AuthProvider';
import { supabase } from '@/lib/supabase';

interface EmailVerificationBannerProps {
  onDismiss?: () => void;
}

const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({ onDismiss }) => {
  const { profile } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Check email verification status
  useEffect(() => {
    const checkEmailStatus = async () => {
      if (!profile?.user_id) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if user has email_confirmed field
        const { data, error } = await supabase
          .from('profiles')
          .select('email_confirmed, email')
          .eq('user_id', profile.user_id)
          .single();

        if (error) {
          console.error('Error checking email verification status:', error);
          setIsLoading(false);
          return;
        }

        const emailConfirmed = data?.email_confirmed ?? true; // Default to true if field doesn't exist
        setIsEmailVerified(emailConfirmed);
        
        // Check if user has dismissed this notification before
        const dismissedKey = `email_verification_dismissed_${profile.user_id}`;
        const wasDismissed = localStorage.getItem(dismissedKey) === 'true';
        
        // Show banner only if email is not verified and wasn't dismissed
        setIsVisible(!emailConfirmed && !wasDismissed);
        
      } catch (error) {
        console.error('Error checking email verification:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkEmailStatus();
  }, [profile?.user_id]);

  const handleDismiss = () => {
    // Remember that user dismissed this notification
    if (profile?.user_id) {
      const dismissedKey = `email_verification_dismissed_${profile.user_id}`;
      localStorage.setItem(dismissedKey, 'true');
    }
    
    setIsVisible(false);
    onDismiss?.();
  };

  const handleResendEmail = async () => {
    if (!profile?.email) return;
    
    try {
      // Trigger resend of verification email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: profile.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm-email`
        }
      });
      
      if (error) {
        console.error('Error resending verification email:', error);
      } else {
        // Show success message
        alert('Verification email sent! Please check your inbox.');
      }
    } catch (error) {
      console.error('Error resending email:', error);
    }
  };

  // Don't render anything while loading or if not visible
  if (isLoading || !isVisible || isEmailVerified) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 shadow-sm relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Mail className="h-5 w-5 text-amber-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-amber-800">
              <span className="font-medium">Email verification pending.</span>{' '}
              Please check your inbox and click the verification link to secure your account.
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Resend Email Button */}
          <button
            onClick={handleResendEmail}
            className="text-amber-800 hover:text-amber-900 text-sm font-medium underline hover:no-underline transition-colors"
          >
            Resend Email
          </button>
          
          {/* Will Do Later Button */}
          <button
            onClick={handleDismiss}
            className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center space-x-1"
          >
            <Clock className="h-3 w-3" />
            <span>Will do later</span>
          </button>
          
          {/* Close X Button */}
          <button
            onClick={handleDismiss}
            className="text-amber-400 hover:text-amber-600 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationBanner;