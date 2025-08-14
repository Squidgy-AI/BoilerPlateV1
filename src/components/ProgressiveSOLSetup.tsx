// src/components/ProgressiveSOLSetup.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, ArrowRight, Edit3, Lock } from 'lucide-react';
import SolarChatConfig from './SolarChatConfig';
import EnhancedChatCalendarSetup from './EnhancedChatCalendarSetup';
import EnhancedChatNotificationSetup from './EnhancedChatNotificationSetup';
import EnhancedChatFacebookSetup from './EnhancedChatFacebookSetup';
import EnhancedChatGHLSetup from './EnhancedChatGHLSetup';
import { SolarBusinessConfig } from '@/config/solarBusinessConfig';
import { CalendarSetup as CalendarSetupType } from '@/config/calendarNotificationConfig';
import { NotificationPreferences as NotificationPrefsType } from '@/config/calendarNotificationConfig';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/utils/getUserId';
import { useFacebookUnlockStatus } from '@/hooks/useFacebookUnlockStatus';
import FacebookUnlockTimer from './FacebookUnlockTimer';

interface ProgressiveSOLSetupProps {
  onComplete: () => void;
  onSkip: () => void; // Keep for backward compatibility but won't use
  sessionId: string;
}

interface SetupProgress {
  solar_completed: boolean;
  calendar_completed: boolean;
  notifications_completed: boolean;
  ghl_completed: boolean;
  facebook_completed: boolean;
  solar_completed_at?: string;
  calendar_completed_at?: string;
  notifications_completed_at?: string;
  ghl_completed_at?: string;
  facebook_completed_at?: string;
}

type SetupStage = 'ghl' | 'solar' | 'calendar' | 'notifications' | 'facebook' | 'complete';

const ProgressiveSOLSetup: React.FC<ProgressiveSOLSetupProps> = ({
  onComplete,
  onSkip,
  sessionId
}) => {
  console.log('🚀 ProgressiveSOLSetup component MOUNTED!', { sessionId });
  
  const [currentStage, setCurrentStage] = useState<SetupStage>('ghl');
  const [progress, setProgress] = useState<SetupProgress>({
    solar_completed: false,
    calendar_completed: false,
    notifications_completed: false,
    ghl_completed: false,
    facebook_completed: false
  });
  const [ghlCredentials, setGhlCredentials] = useState<{location_id: string, user_id: string, user_name: string, user_email: string, ghl_automation_email?: string, ghl_automation_password?: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showFacebookWaitModal, setShowFacebookWaitModal] = useState(false);
  const [isManualNavigation, setIsManualNavigation] = useState(false);
  
  // Check Facebook unlock status
  const { status: facebookUnlockStatus, refetch: refetchFacebookStatus } = useFacebookUnlockStatus(userId || undefined);
  
  // Store form data for each step to allow navigation
  const [formData, setFormData] = useState({
    solar: null as SolarBusinessConfig | null,
    calendar: null as CalendarSetupType | null,
    notifications: null as NotificationPrefsType | null,
    ghl: null as any | null,
    facebook: null as any | null
  });

  // Load existing progress on mount
  useEffect(() => {
    loadSetupProgress();
  }, []);

  // Auto-load GHL credentials when Facebook stage is reached
  useEffect(() => {
    if (currentStage === 'facebook' && !ghlCredentials && !isLoading) {
      console.log('🔄 Facebook stage reached: Auto-loading GHL credentials...');
      loadGHLCredentialsFromDatabase();
    }
  }, [currentStage, ghlCredentials, isLoading]);

  // Auto-navigate to Facebook when it becomes unlocked (but not during manual navigation)
  // Only auto-navigate if user hasn't manually navigated recently
  useEffect(() => {
    if (facebookUnlockStatus?.facebook_unlocked && 
        currentStage === 'notifications' && 
        progress.notifications_completed && 
        !progress.facebook_completed &&
        !isManualNavigation) {
      
      // Only auto-navigate to Facebook in sequential completion flow (within 5 seconds)
      // Do NOT auto-navigate when Facebook unlocks - only on explicit button click
      const timeSinceNotificationCompletion = progress.notifications_completed_at 
        ? Date.now() - new Date(progress.notifications_completed_at).getTime()
        : Infinity;
      
      // Only auto-navigate for immediate sequential completion, not when Facebook unlocks later
      if (timeSinceNotificationCompletion < 5000) {
        console.log('🔓 Facebook unlocked! Auto-navigating to Facebook step (sequential completion)...');
        setShowFacebookWaitModal(false); // Close wait modal if open
        setCurrentStage('facebook');
      } else {
        console.log('🔓 Facebook unlocked - waiting for user to click Complete Setup on Notify page');
        // Just close the wait modal if it's open, but don't auto-navigate
        if (showFacebookWaitModal) {
          console.log('🔓 Closing Facebook wait modal - user can now click Complete Setup to proceed');
          setShowFacebookWaitModal(false);
        }
      }
    }
  }, [facebookUnlockStatus?.facebook_unlocked, currentStage, progress.notifications_completed, progress.facebook_completed, progress.notifications_completed_at, isManualNavigation, showFacebookWaitModal]);

  const loadSetupProgress = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        console.error('Failed to get user ID:', userIdResult.error);
        setHasError(true);
        setIsLoading(false);
        return;
      }
      
      // Set userId for Facebook unlock status hook
      setUserId(userIdResult.user_id);

      console.log('🔍 Loading setup progress from database for user:', userIdResult.user_id);

      // Check unified squidgy_agent_business_setup table for completion status
      const [solarResult, calendarResult, notificationResult, ghlResult, facebookResult] = await Promise.all([
        supabase.from('squidgy_agent_business_setup').select('*').eq('firm_user_id', userIdResult.user_id).eq('agent_id', 'SOLAgent').eq('setup_type', 'SolarSetup').eq('is_enabled', true).single(),
        supabase.from('squidgy_agent_business_setup').select('*').eq('firm_user_id', userIdResult.user_id).eq('agent_id', 'SOLAgent').eq('setup_type', 'CalendarSetup').eq('is_enabled', true).single(),
        supabase.from('squidgy_agent_business_setup').select('*').eq('firm_user_id', userIdResult.user_id).eq('agent_id', 'SOLAgent').eq('setup_type', 'NotificationSetup').eq('is_enabled', true).single(),
        supabase.from('squidgy_agent_business_setup').select('*').eq('firm_user_id', userIdResult.user_id).eq('agent_id', 'SOLAgent').eq('setup_type', 'GHLSetup').eq('is_enabled', true).single(),
        supabase.from('squidgy_agent_business_setup').select('*').eq('firm_user_id', userIdResult.user_id).eq('agent_id', 'SOLAgent').eq('setup_type', 'FacebookIntegration').eq('is_enabled', true).single()
      ]);

      // Log any API errors for debugging
      if (solarResult.error) console.warn('🔴 Solar setup query error:', solarResult.error);
      if (calendarResult.error) console.warn('🔴 Calendar setup query error:', calendarResult.error);
      if (notificationResult.error) console.warn('🔴 Notification setup query error:', notificationResult.error);
      if (ghlResult.error) console.warn('🔴 GHL setup query error:', ghlResult.error);
      if (facebookResult.error) console.warn('🔴 Facebook setup query error:', facebookResult.error);

      const solarCompleted = !solarResult.error && !!solarResult.data;
      const calendarCompleted = !calendarResult.error && !!calendarResult.data;
      const notificationsCompleted = !notificationResult.error && !!notificationResult.data;
      const ghlCompleted = !ghlResult.error && !!ghlResult.data;
      const facebookCompleted = !facebookResult.error && !!facebookResult.data;

      console.log('📊 Database completion status:', {
        solar: solarCompleted,
        calendar: calendarCompleted,
        notifications: notificationsCompleted,
        ghl: ghlCompleted,
        facebook: facebookCompleted
      });

      const progressFromDB = {
        solar_completed: solarCompleted,
        calendar_completed: calendarCompleted,
        notifications_completed: notificationsCompleted,
        ghl_completed: ghlCompleted,
        facebook_completed: facebookCompleted,
        solar_completed_at: solarResult.data?.created_at || '',
        calendar_completed_at: calendarResult.data?.created_at || '',
        notifications_completed_at: notificationResult.data?.created_at || '',
        ghl_completed_at: ghlResult.data?.created_at || '',
        facebook_completed_at: facebookResult.data?.created_at || ''
      };

      setProgress(progressFromDB);
      
      // Load GHL credentials from database if GHL setup is completed
      if (ghlCompleted && ghlResult.data?.setup_json) {
        const ghlConfig = ghlResult.data.setup_json;
        console.log('🔄 Loading GHL credentials from database:', ghlConfig);
        setGhlCredentials({
          location_id: ghlConfig.location_id,
          user_id: ghlConfig.user_id,
          user_name: ghlConfig.user_name,
          user_email: ghlConfig.user_email,
          ghl_automation_email: ghlConfig.ghl_automation_email,
          ghl_automation_password: ghlConfig.ghl_automation_password
        });
      }
      
      // Also save to localStorage for backup
      localStorage.setItem('sol_agent_setup_progress', JSON.stringify(progressFromDB));
      
      // Determine current stage based on database status
      if (!ghlCompleted) {
        setCurrentStage('ghl');
      } else if (!solarCompleted) {
        setCurrentStage('solar');
      } else if (!calendarCompleted) {
        setCurrentStage('calendar');
      } else if (!notificationsCompleted) {
        setCurrentStage('notifications');
      } else if (!facebookCompleted) {
        // Only go to Facebook stage if it's unlocked
        if (facebookUnlockStatus?.facebook_unlocked) {
          setCurrentStage('facebook');
        } else {
          setCurrentStage('notifications'); // Stay on notifications if Facebook is locked
        }
      } else {
        setCurrentStage('complete');
      }

      console.log('✅ Setup progress loaded from database');
    } catch (error) {
      console.error('❌ Error loading setup progress:', error);
      
      // Check for specific RLS/permission errors
      if (error && typeof error === 'object' && 'message' in error) {
        if (error.message.includes('406') || error.message.includes('Not Acceptable')) {
          console.warn('🚫 Database access denied (406) - possible RLS policy issue on squidgy_agent_business_setup table');
        }
      }
      
      // Fallback to localStorage if database fails
      const savedProgress = localStorage.getItem('sol_agent_setup_progress');
      if (savedProgress) {
        const parsedProgress = JSON.parse(savedProgress);
        setProgress(parsedProgress);
        
        if (!parsedProgress.ghl_completed) {
          setCurrentStage('ghl');
        } else if (!parsedProgress.solar_completed) {
          setCurrentStage('solar');
        } else if (!parsedProgress.calendar_completed) {
          setCurrentStage('calendar');
        } else if (!parsedProgress.notifications_completed) {
          setCurrentStage('notifications');
        } else if (!parsedProgress.facebook_completed) {
          setCurrentStage('facebook');
        } else {
          setCurrentStage('complete');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveSetupProgress = (updatedProgress: SetupProgress) => {
    setProgress(updatedProgress);
    localStorage.setItem('sol_agent_setup_progress', JSON.stringify(updatedProgress));
  };

  const addCompletionMessageToChat = async (stage: string, message: string, isFirstTimeCompletion = true) => {
    try {
      console.log(`📝 Attempting to add ${stage} message to chat...`);
      console.log(`📝 Session ID in function: ${sessionId}`);
      
      // Only add chat message on first-time completion, not on edits
      if (!isFirstTimeCompletion) {
        console.log(`⚠️ Skipping chat message for ${stage} - this is an edit, not first-time completion`);
        return;
      }

      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        console.error('Failed to get user ID:', userIdResult.error);
        return;
      }
      
      console.log(`📝 User ID: ${userIdResult.user_id}`);

      // Use safe insert function to prevent duplicates
      const { data, error } = await supabase
        .rpc('safe_insert_chat_history', {
          p_session_id: sessionId,
          p_user_id: userIdResult.user_id,
          p_agent_id: 'SOLAgent',
          p_sender: 'agent',
          p_message: message,
          p_timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('Error adding completion message to chat:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      } else if (data) {
        console.log(`✅ Added ${stage} completion message to chat history (ID: ${data})`);
      } else {
        console.log(`ℹ️ ${stage} completion message already exists in chat history - duplicate prevented`);
      }
    } catch (error) {
      console.error('Error saving completion message:', error);
    }
  };

  const handleSolarComplete = async (config: SolarBusinessConfig, shouldContinue?: boolean) => {
    console.log('🌞 Solar setup completed', shouldContinue ? '(user clicked continue)' : '');
    
    // Check if this is first-time completion or an edit
    const isFirstTimeCompletion = !progress.solar_completed;
    
    // Save form data
    setFormData(prev => ({ ...prev, solar: config }));
    
    // Update progress state immediately
    setProgress(prev => ({ ...prev, solar_completed: true, solar_completed_at: new Date().toISOString() }));
    
    // Add completion message to chat (only on first-time completion)
    await addCompletionMessageToChat(
      'solar',
      '🌞 **Solar Information Setup Complete!** ✅\n\nGreat! I now have all your solar business information configured. This includes your pricing, financing options, and energy rates. I can now provide accurate solar calculations and quotes for your customers.\n\n*Moving to the next step: Calendar Setup*',
      isFirstTimeCompletion
    );
    
    // Navigate to calendar if:
    // 1. It's a first-time completion (sequential flow), OR
    // 2. User explicitly clicked "Continue to Calendar Setup" button
    if (isFirstTimeCompletion || shouldContinue) {
      setCurrentStage('calendar');
    } else {
      console.log('🌞 Solar updated (not first-time), staying on current step');
    }
  };

  const handleCalendarComplete = async (setup: CalendarSetupType) => {
    console.log('📅 Calendar setup completed');
    
    // Check if this is first-time completion or an edit
    const isFirstTimeCompletion = !progress.calendar_completed;
    
    // Save form data
    setFormData(prev => ({ ...prev, calendar: setup }));
    
    // Update progress state immediately
    setProgress(prev => ({ ...prev, calendar_completed: true, calendar_completed_at: new Date().toISOString() }));
    
    // Add completion message to chat (only on first-time completion)
    await addCompletionMessageToChat(
      'calendar',
      '📅 **Calendar Setup Complete!** ✅\n\nPerfect! Your calendar system is now configured with your business hours, appointment durations, and booking rules. Customers can now schedule appointments directly through our chat interface.\n\n*Moving to the next step: Notification Preferences*',
      isFirstTimeCompletion
    );
    
    // Always navigate to next step when "Complete Setup" is clicked
    // This ensures the button works intuitively for users
    console.log('📅 Calendar Complete Setup clicked - navigating to notifications');
    setCurrentStage('notifications');
  };

  const handleNotificationsComplete = async (prefs: NotificationPrefsType) => {
    console.log('🔔 Notification setup completed');
    
    // Check if this is first-time completion or an edit
    const isFirstTimeCompletion = !progress.notifications_completed;
    
    // Save form data
    setFormData(prev => ({ ...prev, notifications: prefs }));
    
    // Update progress state immediately
    setProgress(prev => ({ ...prev, notifications_completed: true, notifications_completed_at: new Date().toISOString() }));
    
    // Add completion message to chat (only on first-time completion)
    await addCompletionMessageToChat(
      'notifications',
      '🔔 **Notification Preferences Setup Complete!** ✅\n\nExcellent! Your notification system is now configured. You\'ll receive alerts about appointments, leads, and system updates through your preferred channels.\n\n*Moving to the final step: Facebook Integration*',
      isFirstTimeCompletion
    );
    
    // Always navigate to next step when "Complete Setup" is clicked
    // First refresh the Facebook unlock status, then check
    console.log('🔄 Refreshing Facebook unlock status...');
    await refetchFacebookStatus();
    
    // Add a small delay to allow status refresh
    setTimeout(async () => {
      // Re-check Facebook unlock status after refresh
      const updatedStatus = await refetchFacebookStatus();
      
      if (updatedStatus?.facebook_unlocked) {
        console.log('🔔 Notifications Complete Setup clicked - Facebook is unlocked, navigating to Facebook');
        setCurrentStage('facebook');
      } else {
        // Show modal that user needs to wait for Facebook unlock
        setShowFacebookWaitModal(true);
        console.log('📝 Facebook not unlocked yet after refresh, showing wait modal');
      }
    }, 500);
  };

  const handleGHLComplete = async (config: any, shouldContinue?: boolean) => {
    console.log('🏢 GHL setup completed', shouldContinue ? '(user clicked continue)' : '');
    
    // Check if this is first-time completion or an edit
    const isFirstTimeCompletion = !progress.ghl_completed;
    
    // Save form data
    setFormData(prev => ({ ...prev, ghl: config }));
    
    // Store GHL credentials for Facebook integration
    setGhlCredentials({
      location_id: config.location_id,
      user_id: config.user_id,
      user_name: config.user_name,
      user_email: config.user_email,
      ghl_automation_email: config.ghl_automation_email,
      ghl_automation_password: config.ghl_automation_password
    });
    
    // Update progress state immediately
    setProgress(prev => ({ ...prev, ghl_completed: true, ghl_completed_at: new Date().toISOString() }));
    
    // Add completion message to chat (only on first-time completion)
    await addCompletionMessageToChat(
      'ghl',
      '🏢 **GoHighLevel Account Setup Complete!** ✅\n\nPerfect! Your GoHighLevel sub-account and user credentials are now configured. This enables all integrations including Facebook, customer management, and automation.\n\n📍 **Location ID:** ' + config.location_id + '\n👤 **User ID:** ' + config.user_id + '\n\n*Moving to the next step: Solar Business Setup*',
      isFirstTimeCompletion
    );
    
    // Trigger Facebook unlock status refresh after GHL completion 
    // (backend automation may take a moment to complete and unlock Facebook)
    if (isFirstTimeCompletion) {
      console.log('🔄 GHL setup completed - will check Facebook unlock status shortly...');
      setTimeout(() => {
        console.log('🔍 Refreshing Facebook unlock status after GHL completion...');
        refetchFacebookStatus();
      }, 100000); // Check after 100 seconds (1.5+ minutes) to allow backend automation to complete
    }

    // Navigate to solar if:
    // 1. It's a first-time completion (sequential flow), OR
    // 2. User explicitly clicked "Continue to Solar Setup" button
    if (isFirstTimeCompletion || shouldContinue) {
      setCurrentStage('solar');
    } else {
      console.log('🏢 GHL updated (not first-time), staying on current step');
    }
  };

  const handleFacebookComplete = async (config: any) => {
    console.log('📘 Facebook integration completed');
    
    // Check if this is first-time completion or an edit
    const isFirstTimeCompletion = !progress.facebook_completed;
    
    // Save form data
    setFormData(prev => ({ ...prev, facebook: config }));
    
    // Update progress state immediately
    setProgress(prev => ({ ...prev, facebook_completed: true, facebook_completed_at: new Date().toISOString() }));
    
    // Add completion message to chat (only on first-time completion)
    await addCompletionMessageToChat(
      'facebook',
      '📘 **Facebook Integration Complete!** ✅\n\n🎉 **Congratulations! Your Solar Sales Specialist is now fully configured and ready to help your customers!**\n\nI can now:\n• Provide accurate solar quotes and calculations\n• Schedule appointments with customers\n• Send notifications via your preferred channels\n• Manage your Facebook pages and social media posting\n• Answer questions about solar energy and financing\n\nYour setup is complete! Feel free to ask me anything about solar energy or try saying "schedule a consultation" to test the booking system.',
      isFirstTimeCompletion
    );
    
    // GHL account was already created during the GHL setup step
    // The credentials are now available for Facebook integration
    
    setCurrentStage('complete');
    
    // Complete the overall setup after a brief delay
    setTimeout(() => {
      onComplete();
    }, 3000); // Increased delay to allow time to read GHL messages
  };

  const canNavigateToStep = (targetStage: SetupStage): boolean => {
    // Can always navigate to current step
    if (targetStage === currentStage) return true;
    
    // Can always navigate to completed steps  
    if (targetStage === 'ghl' && progress.ghl_completed) return true;
    if (targetStage === 'solar' && progress.solar_completed) return true;
    if (targetStage === 'calendar' && progress.calendar_completed) return true;
    if (targetStage === 'notifications' && progress.notifications_completed) return true;
    if (targetStage === 'facebook' && progress.facebook_completed) return true;
    
    // Can navigate to steps that have prerequisites met (even if not completed yet)
    if (targetStage === 'ghl') return true; // Always available (first step)
    if (targetStage === 'solar' && progress.ghl_completed) return true;
    if (targetStage === 'calendar' && progress.solar_completed) return true;
    if (targetStage === 'notifications' && progress.calendar_completed) return true;
    if (targetStage === 'facebook' && progress.notifications_completed) {
      // Check if Facebook is unlocked
      return facebookUnlockStatus?.facebook_unlocked || false;
    }
    
    return false;
  };

  const navigateToStep = async (targetStage: SetupStage) => {
    if (canNavigateToStep(targetStage)) {
      // Set manual navigation flag to prevent auto-navigation conflicts
      setIsManualNavigation(true);
      
      // If navigating to Facebook and GHL credentials are missing, load them from database
      if (targetStage === 'facebook' && !ghlCredentials) {
        console.log('🔄 Facebook navigation: Loading missing GHL credentials...');
        await loadGHLCredentialsFromDatabase();
      }
      setCurrentStage(targetStage);
      
      // Clear manual navigation flag after a longer delay to prevent race conditions
      setTimeout(() => {
        setIsManualNavigation(false);
      }, 3000);
    }
  };

  const loadGHLCredentialsFromDatabase = async () => {
    try {
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) return;

      const { data, error } = await supabase
        .from('squidgy_agent_business_setup')
        .select('setup_json')
        .eq('firm_user_id', userIdResult.user_id)
        .eq('agent_id', 'SOLAgent')
        .eq('setup_type', 'GHLSetup')
        .eq('is_enabled', true)
        .single();

      if (!error && data?.setup_json) {
        const ghlConfig = data.setup_json;
        console.log('✅ Loaded GHL credentials for Facebook:', ghlConfig.location_id);
        setGhlCredentials({
          location_id: ghlConfig.location_id,
          user_id: ghlConfig.user_id,
          user_name: ghlConfig.user_name,
          user_email: ghlConfig.user_email,
          ghl_automation_email: ghlConfig.ghl_automation_email,
          ghl_automation_password: ghlConfig.ghl_automation_password
        });
      }
    } catch (error) {
      console.error('❌ Failed to load GHL credentials:', error);
    }
  };

  console.log('🔍 ProgressiveSOLSetup RENDER DEBUG:');
  console.log('- isLoading:', isLoading);
  console.log('- currentStage:', currentStage);
  console.log('- progress:', progress);
  console.log('- sessionId:', sessionId);
  console.log('🔍 CALENDAR DEBUG:');
  console.log('- progress.calendar_completed:', progress.calendar_completed);
  console.log('- canNavigateToStep(calendar):', canNavigateToStep('calendar'));
  console.log('- currentStage === calendar:', currentStage === 'calendar');

  if (isLoading) {
    console.log('🔄 ProgressiveSOLSetup showing loading state...');
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Loading setup progress...</span>
      </div>
    );
  }

  // Compact progress indicator for chat
  const ProgressIndicator = () => (
    <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">Setup Progress</h3>
        <span className="text-sm text-gray-600">
          Step {currentStage === 'ghl' ? 1 : currentStage === 'solar' ? 2 : currentStage === 'calendar' ? 3 : currentStage === 'notifications' ? 4 : currentStage === 'facebook' ? 5 : 5} of 5
        </span>
      </div>
      
      {/* Responsive Progress Steps - Now Clickable */}
      <div className="grid grid-cols-5 gap-1 mb-3">
        <button
          onClick={() => navigateToStep('ghl')}
          disabled={!canNavigateToStep('ghl')}
          title={progress.ghl_completed ? "✅ Completed - Click to edit" : currentStage === 'ghl' ? "Current step" : "Not yet available"}
          className={`relative flex flex-col items-center text-xs transition-all ${
            progress.ghl_completed ? 'text-green-600 hover:text-green-700' : 
            currentStage === 'ghl' ? 'text-blue-600' : 
            'text-gray-400'
          } ${canNavigateToStep('ghl') ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}`}
        >
          {progress.ghl_completed ? (
            <div className="relative">
              <CheckCircle size={16} />
              <Edit3 size={8} className="absolute -top-1 -right-1 text-green-500 bg-white rounded-full" />
            </div>
          ) : <Clock size={16} />}
          <span className="mt-1 font-medium">Set Up</span>
        </button>
        
        <button
          onClick={() => navigateToStep('solar')}
          disabled={!canNavigateToStep('solar')}
          title={progress.solar_completed ? "✅ Completed - Click to edit" : currentStage === 'solar' ? "Current step" : "Not yet available"}
          className={`relative flex flex-col items-center text-xs transition-all ${
            progress.solar_completed ? 'text-green-600 hover:text-green-700' : 
            currentStage === 'solar' ? 'text-blue-600' : 
            'text-gray-400'
          } ${canNavigateToStep('solar') ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}`}
        >
          {progress.solar_completed ? (
            <div className="relative">
              <CheckCircle size={16} />
              <Edit3 size={8} className="absolute -top-1 -right-1 text-green-500 bg-white rounded-full" />
            </div>
          ) : <Clock size={16} />}
          <span className="mt-1 font-medium">Solar</span>
        </button>
        
        <button
          onClick={() => navigateToStep('calendar')}
          disabled={!canNavigateToStep('calendar')}
          title={progress.calendar_completed ? "✅ Completed - Click to edit" : currentStage === 'calendar' ? "Current step" : "Not yet available"}
          className={`relative flex flex-col items-center text-xs transition-all ${
            progress.calendar_completed ? 'text-green-600 hover:text-green-700' : 
            currentStage === 'calendar' ? 'text-blue-600' : 
            'text-gray-400'
          } ${canNavigateToStep('calendar') ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}`}
        >
          {progress.calendar_completed ? (
            <div className="relative">
              <CheckCircle size={16} />
              <Edit3 size={8} className="absolute -top-1 -right-1 text-green-500 bg-white rounded-full" />
            </div>
          ) : <Clock size={16} />}
          <span className="mt-1 font-medium">Calendar</span>
        </button>
        
        <button
          onClick={() => navigateToStep('notifications')}
          disabled={!canNavigateToStep('notifications')}
          title={progress.notifications_completed ? "✅ Completed - Click to edit" : currentStage === 'notifications' ? "Current step" : "Not yet available"}
          className={`relative flex flex-col items-center text-xs transition-all ${
            progress.notifications_completed ? 'text-green-600 hover:text-green-700' : 
            currentStage === 'notifications' ? 'text-blue-600' : 
            'text-gray-400'
          } ${canNavigateToStep('notifications') ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}`}
        >
          {progress.notifications_completed ? (
            <div className="relative">
              <CheckCircle size={16} />
              <Edit3 size={8} className="absolute -top-1 -right-1 text-green-500 bg-white rounded-full" />
            </div>
          ) : <Clock size={16} />}
          <span className="mt-1 font-medium">Notify</span>
        </button>
        
        <button
          onClick={() => navigateToStep('facebook')}
          disabled={!canNavigateToStep('facebook')}
          title={progress.facebook_completed ? "✅ Completed - Click to edit" : 
                currentStage === 'facebook' ? "Current step" : 
                !facebookUnlockStatus?.facebook_unlocked ? `🔒 Locked: ${facebookUnlockStatus?.message || 'Complete business setup to unlock'}` :
                "Available to configure"}
          className={`relative flex flex-col items-center text-xs transition-all ${
            progress.facebook_completed ? 'text-green-600 hover:text-green-700' : 
            currentStage === 'facebook' ? 'text-blue-600' : 
            facebookUnlockStatus?.facebook_unlocked ? 'text-blue-500' :
            'text-gray-400'
          } ${canNavigateToStep('facebook') ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}`}
        >
          {progress.facebook_completed ? (
            <div className="relative">
              <CheckCircle size={16} />
              <Edit3 size={8} className="absolute -top-1 -right-1 text-green-500 bg-white rounded-full" />
            </div>
          ) : facebookUnlockStatus?.facebook_unlocked ? (
            <div className="relative">
              <Clock size={16} />
              {facebookUnlockStatus.time_remaining && facebookUnlockStatus.time_remaining <= 10 && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
          ) : (
            <div className="relative">
              <Lock size={16} />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            </div>
          )}
          <span className="mt-1 font-medium">Facebook</span>
          {facebookUnlockStatus?.facebook_unlocked && facebookUnlockStatus.time_remaining && (
            <span className="text-xs text-orange-600 font-mono">
              {facebookUnlockStatus.time_remaining}m
            </span>
          )}
        </button>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
          style={{ 
            width: `${
              currentStage === 'ghl' ? 10 :
              currentStage === 'solar' ? 25 :
              currentStage === 'calendar' ? 45 :
              currentStage === 'notifications' ? 65 :
              currentStage === 'facebook' ? 85 :
              100
            }%` 
          }}
        />
      </div>
      
      {/* Facebook Unlock Status Indicator */}
      {(currentStage === 'facebook' || (currentStage === 'notifications' && progress.notifications_completed)) && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <FacebookUnlockTimer 
            firmUserId={userId || undefined}
            onUnlockStatusChange={(unlocked) => {
              // Force re-render when unlock status changes
              if (!unlocked && currentStage === 'facebook') {
                // If Facebook gets locked while user is on Facebook step, go back to notifications
                setCurrentStage('notifications');
              }
            }}
          />
        </div>
      )}
    </div>
  );

  if (currentStage === 'complete') {
    return (
      <div className="max-w-md mx-auto p-4">
        <ProgressIndicator />
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-green-800 mb-2">Setup Complete!</h3>
          <p className="text-green-700 text-sm mb-4">
            Your Solar Sales Specialist is now fully configured and ready to assist your customers.
          </p>
          <button
            onClick={onComplete}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
          >
            Start Using SOL Agent
          </button>
        </div>
      </div>
    );
  }

  console.log('🎯 ProgressiveSOLSetup ABOUT TO RENDER:');
  console.log('- currentStage:', currentStage);
  console.log('- Will show ghl?', currentStage === 'ghl');
  console.log('- Will show solar?', currentStage === 'solar');
  console.log('- Will show calendar?', currentStage === 'calendar');
  console.log('- Will show notifications?', currentStage === 'notifications');
  console.log('- Will show facebook?', currentStage === 'facebook');

  // Early return for error state
  if (hasError && !isLoading) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Setup Available</h3>
          <p className="text-yellow-700 mb-3">
            Let's configure your Solar Sales Specialist! Click below to start with the first component.
          </p>
          <button 
            onClick={() => {
              setHasError(false);
              setCurrentStage('solar');
            }}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors"
          >
            Start Solar Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <ProgressIndicator />
      
      {currentStage === 'ghl' && (
        <EnhancedChatGHLSetup
          onConfigurationComplete={handleGHLComplete}
          onSkip={() => {}} // Dummy function - skip disabled
          sessionId={sessionId}
          existingData={formData.ghl}
        />
      )}
      
      {currentStage === 'solar' && (
        <SolarChatConfig
          onComplete={handleSolarComplete}
          onSkip={() => {}} // Dummy function - skip disabled
          existingData={formData.solar}
        />
      )}
      
      {currentStage === 'calendar' && (
        <EnhancedChatCalendarSetup
          onComplete={handleCalendarComplete}
          onSkip={() => {}} // Dummy function - skip disabled
          sessionId={sessionId}
          existingData={formData.calendar}
        />
      )}
      
      {currentStage === 'notifications' && (
        <EnhancedChatNotificationSetup
          onComplete={handleNotificationsComplete}
          onSkip={() => {}} // Dummy function - skip disabled
          sessionId={sessionId}
          existingData={formData.notifications}
        />
      )}
      
      {currentStage === 'facebook' && (
        <EnhancedChatFacebookSetup
          onConfigurationComplete={handleFacebookComplete}
          onSkip={() => {
            console.log('📘 Facebook setup skipped by user');
            
            // Go directly to completion when Facebook is skipped
            setCurrentStage('complete');
            // Complete the overall setup after a brief delay
            setTimeout(() => {
              onComplete();
            }, 1000);
          }}
          sessionId={sessionId}
          locationId={ghlCredentials?.location_id}
          userId={ghlCredentials?.user_id}
          ghlCredentials={{
            email: ghlCredentials?.ghl_automation_email || ghlCredentials?.user_email || '',
            password: ghlCredentials?.ghl_automation_password || 'Dummy@123'
          }}
          existingData={formData.facebook}
        />
      )}

      {/* Facebook Wait Modal */}
      {showFacebookWaitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="text-center">
              <div className="text-orange-500 text-4xl mb-4">🔒</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Facebook Integration Locked</h2>
              <p className="text-gray-600 mb-4">
                Please wait {facebookUnlockStatus?.time_remaining ? Math.ceil(facebookUnlockStatus.time_remaining) : 'a few'} more minutes for Facebook integration to unlock.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4 text-left">
                <p className="text-sm text-blue-700">
                  <strong>Why is this locked?</strong><br/>
                  Facebook integration unlocks automatically after completing your business setup to ensure all configurations are properly synchronized.
                </p>
              </div>
              <div className="flex items-center justify-center text-sm text-gray-500 mb-4">
                <Clock className="w-4 h-4 mr-1" />
                Time remaining: {facebookUnlockStatus?.time_remaining ? Math.ceil(facebookUnlockStatus.time_remaining) : 'a few'} minutes
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setShowFacebookWaitModal(false)}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Got it, I'll wait
                </button>
                <button
                  onClick={() => {
                    setShowFacebookWaitModal(false);
                    console.log('📘 Facebook setup skipped from wait modal');
                    
                    setCurrentStage('complete');
                    setTimeout(() => {
                      onComplete();
                    }, 1000);
                  }}
                  className="w-full text-gray-500 hover:text-gray-700 text-sm underline transition-colors"
                >
                  Skip Facebook Setup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressiveSOLSetup;