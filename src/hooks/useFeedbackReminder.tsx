// src/hooks/useFeedbackReminder.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/utils/getUserId';

interface FeedbackReminderState {
  showFeedbackDropdown: boolean;
  isResendReminder: boolean;
  config: {
    initial_reminder_days: number;
    resend_reminder_days: number;
    is_disabled: boolean;
    testing_mode: boolean;
  } | null;
}

export const useFeedbackReminder = () => {
  const [state, setState] = useState<FeedbackReminderState>({
    showFeedbackDropdown: false,
    isResendReminder: false,
    config: null
  });

  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const userActivityStartRef = useRef<Date | null>(null);
  const feedbackRecordRef = useRef<any>(null);

  // Initialize the feedback reminder system
  const initializeFeedbackReminder = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        console.log('No user ID available for feedback reminder');
        return;
      }

      // Check if user has existing feedback record
      let { data: existingRecord, error } = await supabase
        .from('followup_feedback_on_firm_user')
        .select('firm_user_id, user_first_active_at, initial_reminder_days, resend_reminder_days, is_disabled, testing_mode, first_reminder_response, wants_feedback_call, updated_at')
        .eq('firm_user_id', userIdResult.user_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!existingRecord) {
        // Create new feedback record for first-time user
        const { data: newRecord, error: insertError } = await supabase
          .from('followup_feedback_on_firm_user')
          .insert({
            firm_user_id: userIdResult.user_id,
            user_first_active_at: new Date().toISOString(),
            initial_reminder_days: 7,
            resend_reminder_days: 3,
            is_disabled: false,
            testing_mode: false
          })
          .select('firm_user_id, user_first_active_at, initial_reminder_days, resend_reminder_days, is_disabled, testing_mode')
          .single();

        if (insertError) {
          throw insertError;
        }

        existingRecord = newRecord;
        console.log('✅ Created new feedback reminder record for user');
      }

      feedbackRecordRef.current = existingRecord;
      
      // Set the config state
      setState(prev => ({
        ...prev,
        config: {
          initial_reminder_days: existingRecord.initial_reminder_days,
          resend_reminder_days: existingRecord.resend_reminder_days,
          is_disabled: existingRecord.is_disabled,
          testing_mode: existingRecord.testing_mode
        }
      }));

      // Set user activity start time
      userActivityStartRef.current = new Date(existingRecord.user_first_active_at);

      // Start monitoring if not disabled and not completed
      if (!existingRecord.is_disabled && !existingRecord.is_completed) {
        startMonitoring(existingRecord);
      }

    } catch (error) {
      console.error('Failed to initialize feedback reminder:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start monitoring for when to show feedback reminders
  const startMonitoring = useCallback((record: any) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Calculate effective timing based on testing mode
    const getEffectiveMinutes = (days: number, testingMode: boolean) => {
      if (testingMode) {
        return days === record.initial_reminder_days ? 2 : 5; // Testing: 2 min + 5 min
      }
      return days * 24 * 60; // Production: convert days to minutes
    };

    const effectiveInitialMinutes = getEffectiveMinutes(record.initial_reminder_days, record.testing_mode);
    const effectiveResendMinutes = getEffectiveMinutes(record.resend_reminder_days, record.testing_mode);

    console.log('🔔 Starting feedback reminder monitoring:', {
      testingMode: record.testing_mode,
      initialReminderDays: record.initial_reminder_days,
      resendReminderDays: record.resend_reminder_days,
      effectiveInitialMinutes,
      effectiveResendMinutes,
      userFirstActiveAt: record.user_first_active_at
    });

    intervalRef.current = setInterval(() => {
      const now = new Date();
      const activityStart = new Date(record.user_first_active_at);
      const minutesSinceStart = (now.getTime() - activityStart.getTime()) / (1000 * 60);

      // Check if we should show initial reminder
      if (!record.first_reminder_sent_at && minutesSinceStart >= effectiveInitialMinutes) {
        console.log('🔔 Time to show initial feedback reminder', {
          minutesSinceStart,
          effectiveInitialMinutes,
          testingMode: record.testing_mode
        });
        showFeedbackReminder(false);
        markReminderSent(false);
      }
      // Check if we should show resend reminder
      else if (
        record.first_reminder_sent_at && 
        !record.first_reminder_responded_at && 
        !record.second_reminder_sent_at
      ) {
        const firstReminderTime = new Date(record.first_reminder_sent_at);
        const minutesSinceFirstReminder = (now.getTime() - firstReminderTime.getTime()) / (1000 * 60);
        
        if (minutesSinceFirstReminder >= effectiveResendMinutes) {
          console.log('🔔 Time to show resend feedback reminder', {
            minutesSinceFirstReminder,
            effectiveResendMinutes,
            testingMode: record.testing_mode
          });
          showFeedbackReminder(true);
          markReminderSent(true);
        }
      }
      // Stop monitoring if user has responded or both reminders sent
      else if (
        record.first_reminder_responded_at || 
        record.second_reminder_responded_at ||
        (record.first_reminder_sent_at && record.second_reminder_sent_at)
      ) {
        console.log('🔔 Feedback reminder monitoring complete');
        stopMonitoring();
      }
    }, 30000); // Check every 30 seconds
  }, []);

  // Show the feedback reminder dropdown
  const showFeedbackReminder = useCallback((isResend: boolean) => {
    setState(prev => ({
      ...prev,
      showFeedbackDropdown: true,
      isResendReminder: isResend
    }));
  }, []);

  // Mark reminder as sent in database
  const markReminderSent = useCallback(async (isResend: boolean) => {
    try {
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) return;

      const now = new Date().toISOString();
      const updateField = isResend ? 'second_reminder_sent_at' : 'first_reminder_sent_at';

      const { error } = await supabase
        .from('followup_feedback_on_firm_user')
        .update({
          [updateField]: now,
          updated_at: now
        })
        .eq('firm_user_id', userIdResult.user_id);

      if (error) {
        console.error('Failed to mark reminder as sent:', error);
      } else {
        // Update local record
        if (feedbackRecordRef.current) {
          feedbackRecordRef.current[updateField] = now;
        }
      }
    } catch (error) {
      console.error('Failed to mark reminder as sent:', error);
    }
  }, []);

  // Hide the feedback dropdown
  const hideFeedbackDropdown = useCallback(() => {
    setState(prev => ({
      ...prev,
      showFeedbackDropdown: false
    }));
  }, []);

  // Handle feedback response
  const handleFeedbackResponse = useCallback((response: string, wantsCall: boolean) => {
    console.log('📝 Feedback response received:', { response, wantsCall });
    
    // If user wants a call, you could integrate with a scheduling system here
    if (wantsCall) {
      console.log('📞 User wants to schedule a call with Seth');
      // TODO: Integrate with scheduling system (Calendly, etc.)
    }

    // Hide the dropdown
    hideFeedbackDropdown();
    
    // Stop monitoring since user has responded
    stopMonitoring();
  }, [hideFeedbackDropdown]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Update configuration
  const updateConfig = useCallback(async (newConfig: any) => {
    setState(prev => ({
      ...prev,
      config: newConfig
    }));

    // If disabled, stop monitoring
    if (newConfig.is_disabled) {
      stopMonitoring();
    } else if (feedbackRecordRef.current && !feedbackRecordRef.current.is_completed) {
      // Restart monitoring with new config
      feedbackRecordRef.current = {
        ...feedbackRecordRef.current,
        ...newConfig
      };
      startMonitoring(feedbackRecordRef.current);
    }
  }, [startMonitoring, stopMonitoring]);

  // Initialize on mount
  useEffect(() => {
    initializeFeedbackReminder();

    // Cleanup on unmount
    return () => {
      stopMonitoring();
    };
  }, [initializeFeedbackReminder, stopMonitoring]);

  return {
    isLoading,
    showFeedbackDropdown: state.showFeedbackDropdown,
    isResendReminder: state.isResendReminder,
    config: state.config,
    hideFeedbackDropdown,
    handleFeedbackResponse,
    updateConfig
  };
};