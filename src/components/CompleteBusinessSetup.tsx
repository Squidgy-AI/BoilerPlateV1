// src/components/CompleteBusinessSetup.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, CheckCircle } from 'lucide-react';
import SolarChatConfig from './SolarChatConfig';
import CalendarSetup from './CalendarSetup';
import NotificationPreferences from './NotificationPreferences';
import { SolarBusinessConfig } from '@/config/solarBusinessConfig';
import { CalendarSetup as CalendarSetupType, NotificationPreferences as NotificationPrefsType } from '@/config/calendarNotificationConfig';

interface CompleteBusinessSetupProps {
  onComplete: () => void;
  onSkip?: () => void;
}

type SetupStep = 'solar' | 'calendar' | 'notifications' | 'complete';

const CompleteBusinessSetup: React.FC<CompleteBusinessSetupProps> = ({
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState<SetupStep>('solar');
  const [solarConfig, setSolarConfig] = useState<SolarBusinessConfig | null>(null);
  const [calendarSetup, setCalendarSetup] = useState<CalendarSetupType | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefsType | null>(null);
  
  const steps = [
    { id: 'solar', name: 'Solar Business Configuration', icon: '☀️' },
    { id: 'calendar', name: 'Calendar Setup', icon: '📅' },
    { id: 'notifications', name: 'Notification Preferences', icon: '🔔' },
  ];

  const getStepStatus = (stepId: string) => {
    const stepOrder = ['solar', 'calendar', 'notifications'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepId);
    
    if (stepIndex < currentIndex || (currentStep === 'complete' && stepIndex <= 2)) {
      return 'complete';
    } else if (stepIndex === currentIndex) {
      return 'current';
    }
    return 'upcoming';
  };

  const handleSolarComplete = (config: SolarBusinessConfig) => {
    setSolarConfig(config);
    setCurrentStep('calendar');
  };

  const handleCalendarComplete = (setup: CalendarSetupType) => {
    setCalendarSetup(setup);
    setCurrentStep('notifications');
  };

  const handleNotificationComplete = (prefs: NotificationPrefsType) => {
    setNotificationPrefs(prefs);
    setCurrentStep('complete');
    
    // Show completion message for 3 seconds then call onComplete
    setTimeout(() => {
      onComplete();
    }, 3000);
  };

  const handleStepSkip = () => {
    if (currentStep === 'solar' && onSkip) {
      onSkip();
    } else if (currentStep === 'calendar') {
      setCurrentStep('notifications');
    } else if (currentStep === 'notifications') {
      setCurrentStep('complete');
      setTimeout(() => {
        onComplete();
      }, 2000);
    }
  };

  // Load existing configurations if user is returning
  useEffect(() => {
    const checkExistingSetup = async () => {
      try {
        // Check if solar config exists
        const solarResponse = await fetch('/api/save-agent-setup?agent_id=SOLAgent');
        if (solarResponse.ok) {
          const solarResult = await solarResponse.json();
          if (solarResult.data?.setup_json) {
            setSolarConfig(solarResult.data.setup_json);
          }
        }

        // Check if calendar setup exists
        const calendarResponse = await fetch('/api/save-calendar-setup');
        if (calendarResponse.ok) {
          const calendarResult = await calendarResponse.json();
          if (calendarResult.data) {
            setCalendarSetup(calendarResult.data);
          }
        }

        // Check if notification preferences exist
        const notifResponse = await fetch('/api/save-notification-preferences');
        if (notifResponse.ok) {
          const notifResult = await notifResponse.json();
          if (notifResult.data) {
            setNotificationPrefs(notifResult.data);
          }
        }
      } catch (error) {
        console.error('Error loading existing setup:', error);
      }
    };

    checkExistingSetup();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Progress Header */}
      {currentStep !== 'complete' && (
        <div className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const status = getStepStatus(step.id);
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}>
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-lg
                        ${status === 'complete' ? 'bg-green-100 text-green-600' : 
                          status === 'current' ? 'bg-blue-600 text-white' : 
                          'bg-gray-200 text-gray-400'}
                      `}>
                        {status === 'complete' ? <CheckCircle className="w-6 h-6" /> : step.icon}
                      </div>
                      <div className="ml-3">
                        <p className={`text-sm font-medium ${
                          status === 'current' ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {step.name}
                        </p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <ChevronRight className="mx-4 text-gray-400" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="py-8">
        {currentStep === 'solar' && (
          <SolarChatConfig
            onComplete={handleSolarComplete}
            onSkip={handleStepSkip}
          />
        )}

        {currentStep === 'calendar' && (
          <CalendarSetup
            onComplete={handleCalendarComplete}
            onSkip={handleStepSkip}
            initialSetup={calendarSetup || undefined}
          />
        )}

        {currentStep === 'notifications' && (
          <NotificationPreferences
            onComplete={handleNotificationComplete}
            onSkip={handleStepSkip}
            initialPreferences={notificationPrefs || undefined}
          />
        )}

        {currentStep === 'complete' && (
          <div className="max-w-2xl mx-auto p-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">Setup Complete! 🎉</h2>
              <p className="text-lg text-gray-600 mb-8">
                Your solar business is now fully configured with:
              </p>
              <div className="space-y-3 text-left max-w-md mx-auto mb-8">
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-3" />
                  <span>Solar business parameters configured</span>
                </div>
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-3" />
                  <span>Calendar and appointment settings ready</span>
                </div>
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-3" />
                  <span>Notification preferences saved</span>
                </div>
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-3" />
                  <span>SOL Agent activated and ready</span>
                </div>
              </div>
              <p className="text-gray-500">
                Redirecting to your dashboard...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompleteBusinessSetup;