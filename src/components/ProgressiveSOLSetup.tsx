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
  const [ghlCredentials, setGhlCredentials] = useState<{location_id: string, user_id: string, user_name: string, user_email: string, ghl_automation_email?: string, ghl_automation_password?: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
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
    
    // Save form data
    setFormData(prev => ({ ...prev, solar: config }));
    
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
    
    // Save form data
    setFormData(prev => ({ ...prev, calendar: setup }));
    
    // Update progress state immediately
    setProgress(prev => ({ ...prev, calendar_completed: true, calendar_completed_at: new Date().toISOString() }));
    
    // Add completion message to chat
    await addCompletionMessageToChat(
      'calendar',
      '📅 **Calendar Setup Complete!** ✅\n\nPerfect! Your calendar system is now configured with your business hours, appointment durations, and booking rules. Customers can now schedule appointments directly through our chat interface.\n\n*Moving to the next step: Notification Preferences*'
    );
    
    setCurrentStage('notifications');
  };

  const handleNotificationsComplete = async (prefs: NotificationPrefsType) => {
    console.log('🔔 Notification setup completed');
    
    // Save form data
    setFormData(prev => ({ ...prev, notifications: prefs }));
    
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
    
    // Add completion message to chat
    await addCompletionMessageToChat(
      'ghl',
      '🏢 **GoHighLevel Account Setup Complete!** ✅\n\nPerfect! Your GoHighLevel sub-account and user credentials are now configured. This enables all integrations including Facebook, customer management, and automation.\n\n📍 **Location ID:** ' + config.location_id + '\n👤 **User ID:** ' + config.user_id + '\n\n*Moving to the final step: Facebook Integration*'
    );
    
    setCurrentStage('facebook');
  };

  const handleFacebookComplete = async (config: any) => {
    console.log('📘 Facebook integration completed');
    
    // Save form data
    setFormData(prev => ({ ...prev, facebook: config }));
    
    // Update progress state immediately
    setProgress(prev => ({ ...prev, facebook_completed: true, facebook_completed_at: new Date().toISOString() }));
    
    // Add completion message to chat
    await addCompletionMessageToChat(
      'facebook',
      '📘 **Facebook Integration Complete!** ✅\n\n🎉 **Congratulations! Your Solar Sales Specialist is now fully configured and ready to help your customers!**\n\nI can now:\n• Provide accurate solar quotes and calculations\n• Schedule appointments with customers\n• Send notifications via your preferred channels\n• Manage your Facebook pages and social media posting\n• Answer questions about solar energy and financing\n\nYour setup is complete! Feel free to ask me anything about solar energy or try saying "schedule a consultation" to test the booking system.'
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
    // Can always go to current or previous steps
    const stageOrder = ['solar', 'calendar', 'notifications', 'ghl', 'facebook'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const targetIndex = stageOrder.indexOf(targetStage);
    
    // Can navigate to any previous step or current step
    if (targetIndex <= currentIndex) return true;
    
    // Can navigate to next step only if previous steps are completed
    if (targetStage === 'calendar' && progress.solar_completed) return true;
    if (targetStage === 'notifications' && progress.calendar_completed) return true;
    if (targetStage === 'ghl' && progress.notifications_completed) return true;
    if (targetStage === 'facebook' && progress.ghl_completed) return true;
    
    return false;
  };

  const navigateToStep = (targetStage: SetupStage) => {
    if (canNavigateToStep(targetStage)) {
      setCurrentStage(targetStage);
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
      
      {/* Responsive Progress Steps - Now Clickable */}
      <div className="grid grid-cols-5 gap-1 mb-3">
        <button
          onClick={() => navigateToStep('solar')}
          disabled={!canNavigateToStep('solar')}
          className={`flex flex-col items-center text-xs transition-all ${
            progress.solar_completed ? 'text-green-600' : 
            currentStage === 'solar' ? 'text-blue-600' : 
            'text-gray-400'
          } ${canNavigateToStep('solar') ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}`}
        >
          {progress.solar_completed ? <CheckCircle size={16} /> : <Clock size={16} />}
          <span className="mt-1 font-medium">Solar</span>
        </button>
        
        <button
          onClick={() => navigateToStep('calendar')}
          disabled={!canNavigateToStep('calendar')}
          className={`flex flex-col items-center text-xs transition-all ${
            progress.calendar_completed ? 'text-green-600' : 
            currentStage === 'calendar' ? 'text-blue-600' : 
            'text-gray-400'
          } ${canNavigateToStep('calendar') ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}`}
        >
          {progress.calendar_completed ? <CheckCircle size={16} /> : <Clock size={16} />}
          <span className="mt-1 font-medium">Calendar</span>
        </button>
        
        <button
          onClick={() => navigateToStep('notifications')}
          disabled={!canNavigateToStep('notifications')}
          className={`flex flex-col items-center text-xs transition-all ${
            progress.notifications_completed ? 'text-green-600' : 
            currentStage === 'notifications' ? 'text-blue-600' : 
            'text-gray-400'
          } ${canNavigateToStep('notifications') ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}`}
        >
          {progress.notifications_completed ? <CheckCircle size={16} /> : <Clock size={16} />}
          <span className="mt-1 font-medium">Notify</span>
        </button>
        
        <button
          onClick={() => navigateToStep('ghl')}
          disabled={!canNavigateToStep('ghl')}
          className={`flex flex-col items-center text-xs transition-all ${
            progress.ghl_completed ? 'text-green-600' : 
            currentStage === 'ghl' ? 'text-blue-600' : 
            'text-gray-400'
          } ${canNavigateToStep('ghl') ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}`}
        >
          {progress.ghl_completed ? <CheckCircle size={16} /> : <Clock size={16} />}
          <span className="mt-1 font-medium">Set Up</span>
        </button>
        
        <button
          onClick={() => navigateToStep('facebook')}
          disabled={!canNavigateToStep('facebook')}
          className={`flex flex-col items-center text-xs transition-all ${
            progress.facebook_completed ? 'text-green-600' : 
            currentStage === 'facebook' ? 'text-blue-600' : 
            'text-gray-400'
          } ${canNavigateToStep('facebook') ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}`}
        >
          {progress.facebook_completed ? <CheckCircle size={16} /> : <Clock size={16} />}
          <span className="mt-1 font-medium">Facebook</span>
        </button>
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
      
      {currentStage === 'ghl' && (
        <EnhancedChatGHLSetup
          onConfigurationComplete={handleGHLComplete}
          onSkip={() => {}} // Dummy function - skip disabled
          sessionId={sessionId}
          existingData={formData.ghl}
        />
      )}
      
      {currentStage === 'facebook' && (
        <EnhancedChatFacebookSetup
          onConfigurationComplete={handleFacebookComplete}
          onSkip={() => {}} // Dummy function - skip disabled
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
    </div>
  );
};

export default ProgressiveSOLSetup;