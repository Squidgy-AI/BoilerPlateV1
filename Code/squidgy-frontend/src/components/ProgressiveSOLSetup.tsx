// src/components/ProgressiveSOLSetup.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, ArrowRight } from 'lucide-react';
import SolarChatConfig from './SolarChatConfig';
import EnhancedChatCalendarSetup from './EnhancedChatCalendarSetup';
import EnhancedChatNotificationSetup from './EnhancedChatNotificationSetup';
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
  solar_completed_at?: string;
  calendar_completed_at?: string;
  notifications_completed_at?: string;
}

type SetupStage = 'solar' | 'calendar' | 'notifications' | 'complete';

const ProgressiveSOLSetup: React.FC<ProgressiveSOLSetupProps> = ({
  onComplete,
  onSkip,
  sessionId
}) => {
  const [currentStage, setCurrentStage] = useState<SetupStage>('solar');
  const [progress, setProgress] = useState<SetupProgress>({
    solar_completed: false,
    calendar_completed: false,
    notifications_completed: false
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load existing progress on mount
  useEffect(() => {
    loadSetupProgress();
  }, []);

  const loadSetupProgress = async () => {
    try {
      setIsLoading(true);
      
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        console.error('Failed to get user ID:', userIdResult.error);
        return;
      }

      console.log('🔍 Loading setup progress from database for user:', userIdResult.user_id);

      // Check unified squidgy_agent_business_setup table for completion status
      const [solarResult, calendarResult, notificationResult] = await Promise.all([
        supabase.from('squidgy_agent_business_setup').select('*').eq('firm_user_id', userIdResult.user_id).eq('agent_id', 'SOLAgent').eq('setup_type', 'SolarSetup').eq('is_enabled', true).single(),
        supabase.from('squidgy_agent_business_setup').select('*').eq('firm_user_id', userIdResult.user_id).eq('agent_id', 'SOLAgent').eq('setup_type', 'CalendarSetup').eq('is_enabled', true).single(),
        supabase.from('squidgy_agent_business_setup').select('*').eq('firm_user_id', userIdResult.user_id).eq('agent_id', 'SOLAgent').eq('setup_type', 'NotificationSetup').eq('is_enabled', true).single()
      ]);

      // Log any API errors for debugging
      if (solarResult.error) console.warn('🔴 Solar setup query error:', solarResult.error);
      if (calendarResult.error) console.warn('🔴 Calendar setup query error:', calendarResult.error);
      if (notificationResult.error) console.warn('🔴 Notification setup query error:', notificationResult.error);

      const solarCompleted = !solarResult.error && !!solarResult.data;
      const calendarCompleted = !calendarResult.error && !!calendarResult.data;
      const notificationsCompleted = !notificationResult.error && !!notificationResult.data;

      console.log('📊 Database completion status:', {
        solar: solarCompleted,
        calendar: calendarCompleted,
        notifications: notificationsCompleted
      });

      const progressFromDB = {
        solar_completed: solarCompleted,
        calendar_completed: calendarCompleted,
        notifications_completed: notificationsCompleted,
        solar_completed_at: solarResult.data?.created_at || '',
        calendar_completed_at: calendarResult.data?.created_at || '',
        notifications_completed_at: notificationResult.data?.created_at || ''
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
      '🔔 **Notification Preferences Setup Complete!** ✅\n\n🎉 **Congratulations! Your Solar Sales Specialist is now fully configured and ready to help your customers!**\n\nI can now:\n• Provide accurate solar quotes and calculations\n• Schedule appointments with customers\n• Send notifications via your preferred channels\n• Answer questions about solar energy and financing\n\nYour setup is complete! Feel free to ask me anything about solar energy or try saying "schedule a consultation" to test the booking system.'
    );
    
    setCurrentStage('complete');
    
    // Complete the overall setup after a brief delay
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  const handleSkipStage = async () => {
    // For now, skip to the end
    await addCompletionMessageToChat(
      'skipped',
      'Setup was skipped. You can always complete the configuration later by saying "configure solar business" in the chat.'
    );
    onSkip();
  };

  if (isLoading) {
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
          Step {currentStage === 'solar' ? 1 : currentStage === 'calendar' ? 2 : currentStage === 'notifications' ? 3 : 3} of 3
        </span>
      </div>
      
      <div className="flex items-center space-x-2 mb-3">
        <div className={`flex items-center text-sm ${progress.solar_completed ? 'text-green-600' : currentStage === 'solar' ? 'text-blue-600' : 'text-gray-400'}`}>
          {progress.solar_completed ? <CheckCircle size={16} /> : <Clock size={16} />}
          <span className="ml-1 font-medium">Solar</span>
        </div>
        
        <ArrowRight className="text-gray-300" size={14} />
        
        <div className={`flex items-center text-sm ${progress.calendar_completed ? 'text-green-600' : currentStage === 'calendar' ? 'text-blue-600' : 'text-gray-400'}`}>
          {progress.calendar_completed ? <CheckCircle size={16} /> : <Clock size={16} />}
          <span className="ml-1 font-medium">Calendar</span>
        </div>
        
        <ArrowRight className="text-gray-300" size={14} />
        
        <div className={`flex items-center text-sm ${progress.notifications_completed ? 'text-green-600' : currentStage === 'notifications' ? 'text-blue-600' : 'text-gray-400'}`}>
          {progress.notifications_completed ? <CheckCircle size={16} /> : <Clock size={16} />}
          <span className="ml-1 font-medium">Notifications</span>
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
          style={{ 
            width: `${
              currentStage === 'solar' ? 10 :
              currentStage === 'calendar' ? 40 :
              currentStage === 'notifications' ? 70 :
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
    </div>
  );
};

export default ProgressiveSOLSetup;