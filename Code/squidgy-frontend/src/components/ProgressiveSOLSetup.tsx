// src/components/ProgressiveSOLSetup.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, ArrowRight } from 'lucide-react';
import SolarAgentSetup from './SolarAgentSetup';
import CalendarSetup from './CalendarSetup';
import NotificationPreferences from './NotificationPreferences';
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

      // Check localStorage for setup progress
      const savedProgress = localStorage.getItem('sol_agent_setup_progress');
      if (savedProgress) {
        const parsedProgress = JSON.parse(savedProgress);
        setProgress(parsedProgress);
        
        // Determine current stage based on progress
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
    } catch (error) {
      console.error('Error loading setup progress:', error);
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
    const completedAt = new Date().toISOString();
    const updatedProgress = {
      ...progress,
      solar_completed: true,
      solar_completed_at: completedAt
    };
    
    saveSetupProgress(updatedProgress);
    
    // Add completion message to chat
    await addCompletionMessageToChat(
      'solar',
      '🌞 **Solar Information Setup Complete!** ✅\n\nGreat! I now have all your solar business information configured. This includes your pricing, financing options, and energy rates. I can now provide accurate solar calculations and quotes for your customers.\n\n*Moving to the next step: Calendar Setup*'
    );
    
    setCurrentStage('calendar');
  };

  const handleCalendarComplete = async (setup: CalendarSetupType) => {
    const completedAt = new Date().toISOString();
    const updatedProgress = {
      ...progress,
      calendar_completed: true,
      calendar_completed_at: completedAt
    };
    
    saveSetupProgress(updatedProgress);
    
    // Add completion message to chat
    await addCompletionMessageToChat(
      'calendar',
      '📅 **Calendar Setup Complete!** ✅\n\nPerfect! Your calendar system is now configured with your business hours, appointment durations, and booking rules. Customers can now schedule appointments directly through our chat interface.\n\n*Moving to the final step: Notification Preferences*'
    );
    
    setCurrentStage('notifications');
  };

  const handleNotificationsComplete = async (prefs: NotificationPrefsType) => {
    const completedAt = new Date().toISOString();
    const updatedProgress = {
      ...progress,
      notifications_completed: true,
      notifications_completed_at: completedAt
    };
    
    saveSetupProgress(updatedProgress);
    
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

  // Progress indicator
  const ProgressIndicator = () => (
    <div className="mb-8 bg-white rounded-xl p-6 shadow-sm border">
      <h2 className="text-xl font-bold mb-4 text-center">Solar Sales Specialist Setup Progress</h2>
      <div className="flex items-center justify-between mb-6">
        <div className={`flex items-center ${progress.solar_completed ? 'text-green-600' : currentStage === 'solar' ? 'text-blue-600' : 'text-gray-400'}`}>
          {progress.solar_completed ? <CheckCircle size={20} /> : <Clock size={20} />}
          <span className="ml-2 font-medium">Solar Information</span>
        </div>
        
        <ArrowRight className="text-gray-300" size={16} />
        
        <div className={`flex items-center ${progress.calendar_completed ? 'text-green-600' : currentStage === 'calendar' ? 'text-blue-600' : 'text-gray-400'}`}>
          {progress.calendar_completed ? <CheckCircle size={20} /> : <Clock size={20} />}
          <span className="ml-2 font-medium">Calendar Setup</span>
        </div>
        
        <ArrowRight className="text-gray-300" size={16} />
        
        <div className={`flex items-center ${progress.notifications_completed ? 'text-green-600' : currentStage === 'notifications' ? 'text-blue-600' : 'text-gray-400'}`}>
          {progress.notifications_completed ? <CheckCircle size={20} /> : <Clock size={20} />}
          <span className="ml-2 font-medium">Notifications</span>
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ 
            width: `${
              currentStage === 'solar' ? 0 :
              currentStage === 'calendar' ? 33 :
              currentStage === 'notifications' ? 66 :
              100
            }%` 
          }}
        />
      </div>
    </div>
  );

  if (currentStage === 'complete') {
    return (
      <div className="text-center p-8">
        <ProgressIndicator />
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">Setup Complete!</h2>
          <p className="text-green-700 mb-4">
            Your Solar Sales Specialist is now fully configured and ready to assist your customers.
          </p>
          <button
            onClick={onComplete}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Start Using SOL Agent
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <ProgressIndicator />
      
      {currentStage === 'solar' && (
        <SolarAgentSetup
          onConfigurationComplete={handleSolarComplete}
          onSkip={handleSkipStage}
        />
      )}
      
      {currentStage === 'calendar' && (
        <CalendarSetup
          onComplete={handleCalendarComplete}
          onSkip={handleSkipStage}
        />
      )}
      
      {currentStage === 'notifications' && (
        <NotificationPreferences
          onComplete={handleNotificationsComplete}
          onSkip={handleSkipStage}
        />
      )}
    </div>
  );
};

export default ProgressiveSOLSetup;