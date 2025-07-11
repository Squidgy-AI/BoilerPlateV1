// src/components/ProgressiveSOLSetup.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, ArrowRight } from 'lucide-react';
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

interface ProgressiveSOLSetupProps {
  onComplete: () => void;
  onSkip: () => void;
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

type SetupStage = 'solar' | 'calendar' | 'notifications' | 'ghl' | 'facebook' | 'complete';

const ProgressiveSOLSetup: React.FC<ProgressiveSOLSetupProps> = ({
  onComplete,
  onSkip,
  sessionId
}) => {
  console.log('🚀 ProgressiveSOLSetup component MOUNTED!', { sessionId });
  
  const [currentStage, setCurrentStage] = useState<SetupStage>('solar');
  const [progress, setProgress] = useState<SetupProgress>({
    solar_completed: false,
    calendar_completed: false,
    notifications_completed: false,
    ghl_completed: false,
    facebook_completed: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Load existing progress on mount
  useEffect(() => {
    loadSetupProgress();
  }, []);

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
      
      // Also save to localStorage for backup
      localStorage.setItem('sol_agent_setup_progress', JSON.stringify(progressFromDB));
      
      // Determine current stage based on database status
      if (!solarCompleted) {
        setCurrentStage('solar');
      } else if (!calendarCompleted) {
        setCurrentStage('calendar');
      } else if (!notificationsCompleted) {
        setCurrentStage('notifications');
      } else if (!ghlCompleted) {
        setCurrentStage('ghl');
      } else if (!facebookCompleted) {
        setCurrentStage('facebook');
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
        
        if (!parsedProgress.solar_completed) {
          setCurrentStage('solar');
        } else if (!parsedProgress.calendar_completed) {
          setCurrentStage('calendar');
        } else if (!parsedProgress.notifications_completed) {
          setCurrentStage('notifications');
        } else if (!parsedProgress.ghl_completed) {
          setCurrentStage('ghl');
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

  const addCompletionMessageToChat = async (stage: string, message: string) => {
    try {
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        console.error('Failed to get user ID:', userIdResult.error);
        return;
      }

      // Add completion message to chat history
      const { error } = await supabase
        .from('chat_history')
        .insert({
          user_id: userIdResult.user_id,
          session_id: sessionId,
          agent_id: 'SOLAgent',
          agent_name: 'Solar Sales Specialist',
          sender: 'agent',
          message: message,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('Error adding completion message to chat:', error);
      } else {
        console.log(`✅ Added ${stage} completion message to chat history`);
      }
    } catch (error) {
      console.error('Error saving completion message:', error);
    }
  };

  const handleSolarComplete = async (config: SolarBusinessConfig) => {
    console.log('🌞 Solar setup completed');
    
    // Update progress state immediately
    setProgress(prev => ({ ...prev, solar_completed: true, solar_completed_at: new Date().toISOString() }));
    
    // Add completion message to chat
    await addCompletionMessageToChat(
      'solar',
      '🌞 **Solar Information Setup Complete!** ✅\n\nGreat! I now have all your solar business information configured. This includes your pricing, financing options, and energy rates. I can now provide accurate solar calculations and quotes for your customers.\n\n*Moving to the next step: Calendar Setup*'
    );
    
    setCurrentStage('calendar');
  };

  const handleCalendarComplete = async (setup: CalendarSetupType) => {
    console.log('📅 Calendar setup completed');
    
    // Update progress state immediately
    setProgress(prev => ({ ...prev, calendar_completed: true, calendar_completed_at: new Date().toISOString() }));
    
    // Add completion message to chat
    await addCompletionMessageToChat(
      'calendar',
      '📅 **Calendar Setup Complete!** ✅\n\nPerfect! Your calendar system is now configured with your business hours, appointment durations, and booking rules. Customers can now schedule appointments directly through our chat interface.\n\n*Moving to the final step: Notification Preferences*'
    );
    
    setCurrentStage('notifications');
  };

  const handleNotificationsComplete = async (prefs: NotificationPrefsType) => {
    console.log('🔔 Notification setup completed');
    
    // Update progress state immediately
    setProgress(prev => ({ ...prev, notifications_completed: true, notifications_completed_at: new Date().toISOString() }));
    
    // Add completion message to chat
    await addCompletionMessageToChat(
      'notifications',
      '🔔 **Notification Preferences Setup Complete!** ✅\n\nExcellent! Your notification system is now configured. You\'ll receive alerts about appointments, leads, and system updates through your preferred channels.\n\n*Moving to the next step: GoHighLevel Account Setup*'
    );
    
    setCurrentStage('ghl');
  };

  const handleGHLComplete = async (config: any) => {
    console.log('🏢 GHL setup completed');
    
    // Update progress state immediately
    setProgress(prev => ({ ...prev, ghl_completed: true, ghl_completed_at: new Date().toISOString() }));
    
    // Add completion message to chat
    await addCompletionMessageToChat(
      'ghl',
      '🏢 **GoHighLevel Account Setup Complete!** ✅\n\nPerfect! Your GoHighLevel sub-account and user credentials are now configured. This enables all integrations including Facebook, customer management, and automation.\n\n*Moving to the final step: Facebook Integration*'
    );
    
    setCurrentStage('facebook');
  };

  const handleFacebookComplete = async (config: any) => {
    console.log('📘 Facebook integration completed');
    
    // Update progress state immediately
    setProgress(prev => ({ ...prev, facebook_completed: true, facebook_completed_at: new Date().toISOString() }));
    
    // Add completion message to chat
    await addCompletionMessageToChat(
      'facebook',
      '📘 **Facebook Integration Complete!** ✅\n\n🎉 **Congratulations! Your Solar Sales Specialist is now fully configured and ready to help your customers!**\n\nI can now:\n• Provide accurate solar quotes and calculations\n• Schedule appointments with customers\n• Send notifications via your preferred channels\n• Manage your Facebook pages and social media posting\n• Answer questions about solar energy and financing\n\nYour setup is complete! Feel free to ask me anything about solar energy or try saying "schedule a consultation" to test the booking system.'
    );
    
    // Create GHL subaccount and user after all setup is complete
    try {
      console.log('🚀 Creating GoHighLevel sub-account and user...');
      
      // Add message about GHL setup starting
      await addCompletionMessageToChat(
        'ghl_creating',
        '⏳ **Creating your GoHighLevel account...**\n\nSetting up your business automation platform with all solar configurations...'
      );
      
      // Replace with your actual values - in production these should come from environment variables
      const ghlConfig = {
        company_id: "lp2p1q27DrdGta1qGDJd",
        snapshot_id: "7oAH6Cmto5ZcWAaEsrrq",  // SOL - Solar Assistant snapshot
        agency_token: "pit-c4e9d6af-8956-4a84-9b83-554fb6801a69"
      };
      
      // Get backend URL
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'localhost:8000';
      const backendUrl = apiBase.startsWith('http') ? apiBase : `https://${apiBase}`;
      const cleanBackendUrl = backendUrl.replace(/\/$/, '');
      
      const response = await fetch(`${cleanBackendUrl}/api/ghl/create-subaccount-and-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ghlConfig),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ GHL creation successful:', result);
        
        // Add success message to chat
        await addCompletionMessageToChat(
          'ghl_success',
          `✅ **GoHighLevel Account Created Successfully!**\n\n📋 **Sub-account Details:**\n• Name: ${result.subaccount.details.name}\n• ID: ${result.subaccount.location_id}\n\n👤 **User Account Created:**\n• Name: ${result.user.details.name}\n• Email: ${result.user.details.email}\n• Role: ${result.user.details.role}\n\nYour GoHighLevel account is now ready with all solar workflows, pipelines, and automations!`
        );
      } else {
        const error = await response.text();
        console.error('❌ GHL creation failed:', error);
        
        // Add error message to chat
        await addCompletionMessageToChat(
          'ghl_error',
          '⚠️ **Note:** Your Solar Sales Specialist is fully configured, but the GoHighLevel account creation encountered an issue. You can still use all chat features. Please contact support if you need assistance with GoHighLevel setup.'
        );
      }
    } catch (error) {
      console.error('❌ Error creating GHL account:', error);
      
      // Add error message to chat
      await addCompletionMessageToChat(
        'ghl_error',
        '⚠️ **Note:** Your Solar Sales Specialist is ready to use! However, the automated GoHighLevel setup encountered a temporary issue. All chat features are working perfectly. Contact support if you need help with GoHighLevel.'
      );
    }
    
    setCurrentStage('complete');
    
    // Complete the overall setup after a brief delay
    setTimeout(() => {
      onComplete();
    }, 3000); // Increased delay to allow time to read GHL messages
  };

  const handleSkipStage = async () => {
    // Progress to next stage if skipping individual steps
    if (currentStage === 'solar') {
      setCurrentStage('calendar');
    } else if (currentStage === 'calendar') {
      setCurrentStage('notifications');
    } else if (currentStage === 'notifications') {
      setCurrentStage('ghl');
    } else if (currentStage === 'ghl') {
      setCurrentStage('facebook');
    } else {
      // For Facebook stage or final skip, skip to the end
      await addCompletionMessageToChat(
        'skipped',
        'Setup was skipped. You can always complete the configuration later by saying "configure solar business" in the chat.'
      );
      onSkip();
    }
  };

  console.log('🔍 ProgressiveSOLSetup RENDER DEBUG:');
  console.log('- isLoading:', isLoading);
  console.log('- currentStage:', currentStage);
  console.log('- progress:', progress);
  console.log('- sessionId:', sessionId);

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
          Step {currentStage === 'solar' ? 1 : currentStage === 'calendar' ? 2 : currentStage === 'notifications' ? 3 : currentStage === 'ghl' ? 4 : currentStage === 'facebook' ? 5 : 5} of 5
        </span>
      </div>
      
      {/* Responsive Progress Steps */}
      <div className="grid grid-cols-5 gap-1 mb-3">
        <div className={`flex flex-col items-center text-xs ${progress.solar_completed ? 'text-green-600' : currentStage === 'solar' ? 'text-blue-600' : 'text-gray-400'}`}>
          {progress.solar_completed ? <CheckCircle size={16} /> : <Clock size={16} />}
          <span className="mt-1 font-medium">Solar</span>
        </div>
        
        <div className={`flex flex-col items-center text-xs ${progress.calendar_completed ? 'text-green-600' : currentStage === 'calendar' ? 'text-blue-600' : 'text-gray-400'}`}>
          {progress.calendar_completed ? <CheckCircle size={16} /> : <Clock size={16} />}
          <span className="mt-1 font-medium">Calendar</span>
        </div>
        
        <div className={`flex flex-col items-center text-xs ${progress.notifications_completed ? 'text-green-600' : currentStage === 'notifications' ? 'text-blue-600' : 'text-gray-400'}`}>
          {progress.notifications_completed ? <CheckCircle size={16} /> : <Clock size={16} />}
          <span className="mt-1 font-medium">Notify</span>
        </div>
        
        <div className={`flex flex-col items-center text-xs ${progress.ghl_completed ? 'text-green-600' : currentStage === 'ghl' ? 'text-blue-600' : 'text-gray-400'}`}>
          {progress.ghl_completed ? <CheckCircle size={16} /> : <Clock size={16} />}
          <span className="mt-1 font-medium">Set Up</span>
        </div>
        
        <div className={`flex flex-col items-center text-xs ${progress.facebook_completed ? 'text-green-600' : currentStage === 'facebook' ? 'text-blue-600' : 'text-gray-400'}`}>
          {progress.facebook_completed ? <CheckCircle size={16} /> : <Clock size={16} />}
          <span className="mt-1 font-medium">Facebook</span>
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
          style={{ 
            width: `${
              currentStage === 'solar' ? 10 :
              currentStage === 'calendar' ? 25 :
              currentStage === 'notifications' ? 45 :
              currentStage === 'ghl' ? 65 :
              currentStage === 'facebook' ? 85 :
              100
            }%` 
          }}
        />
      </div>
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
  console.log('- Will show solar?', currentStage === 'solar');
  console.log('- Will show calendar?', currentStage === 'calendar');
  console.log('- Will show notifications?', currentStage === 'notifications');
  console.log('- Will show ghl?', currentStage === 'ghl');
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
      
      {currentStage === 'solar' && (
        <SolarChatConfig
          onComplete={handleSolarComplete}
          onSkip={handleSkipStage}
        />
      )}
      
      {currentStage === 'calendar' && (
        <EnhancedChatCalendarSetup
          onComplete={handleCalendarComplete}
          onSkip={handleSkipStage}
          sessionId={sessionId}
        />
      )}
      
      {currentStage === 'notifications' && (
        <EnhancedChatNotificationSetup
          onComplete={handleNotificationsComplete}
          onSkip={handleSkipStage}
          sessionId={sessionId}
        />
      )}
      
      {currentStage === 'ghl' && (
        <EnhancedChatGHLSetup
          onConfigurationComplete={handleGHLComplete}
          onSkip={handleSkipStage}
          sessionId={sessionId}
        />
      )}
      
      {currentStage === 'facebook' && (
        <EnhancedChatFacebookSetup
          onConfigurationComplete={handleFacebookComplete}
          onSkip={handleSkipStage}
          sessionId={sessionId}
        />
      )}
    </div>
  );
};

export default ProgressiveSOLSetup;