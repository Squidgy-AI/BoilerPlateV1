// src/components/SetupStatusIndicator.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, Calendar, Bell, Sun, History, ChevronDown, ChevronUp } from 'lucide-react';

interface SetupStatusIndicatorProps {
  agentId: string;
  onViewHistory?: () => void;
}

interface SetupStatus {
  solar: boolean;
  calendar: boolean;
  notifications: boolean;
}

const SetupStatusIndicator: React.FC<SetupStatusIndicatorProps> = ({ 
  agentId, 
  onViewHistory 
}) => {
  const [setupStatus, setSetupStatus] = useState<SetupStatus>({
    solar: false,
    calendar: false,
    notifications: false
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSetupStatus();
  }, [agentId]);

  const checkSetupStatus = async () => {
    if (agentId !== 'SOLAgent') {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Check solar configuration
      const solarConfig = localStorage.getItem('solarBusinessConfig');
      let solarFromApi = false;
      
      try {
        const solarResponse = await fetch('/api/save-agent-setup?agent_id=SOLAgent');
        if (solarResponse.ok) {
          const solarResult = await solarResponse.json();
          solarFromApi = !!solarResult.data?.setup_json;
        }
      } catch (error) {
        console.warn('Error checking solar API status:', error);
      }

      // Check calendar setup
      let calendarFromApi = false;
      try {
        const calendarResponse = await fetch('/api/save-calendar-setup');
        if (calendarResponse.ok) {
          const calendarResult = await calendarResponse.json();
          calendarFromApi = !!calendarResult.data;
        }
      } catch (error) {
        console.warn('Error checking calendar API status:', error);
      }

      // Check notification preferences
      let notificationFromApi = false;
      try {
        const notifResponse = await fetch('/api/save-notification-preferences');
        if (notifResponse.ok) {
          const notifResult = await notifResponse.json();
          notificationFromApi = !!notifResult.data;
        }
      } catch (error) {
        console.warn('Error checking notification API status:', error);
      }

      setSetupStatus({
        solar: !!(solarConfig || solarFromApi),
        calendar: calendarFromApi,
        notifications: notificationFromApi
      });
    } catch (error) {
      console.error('Error checking setup status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (agentId !== 'SOLAgent' || isLoading) {
    return null;
  }

  const allComplete = setupStatus.solar && setupStatus.calendar && setupStatus.notifications;
  const anyComplete = setupStatus.solar || setupStatus.calendar || setupStatus.notifications;

  if (!anyComplete) {
    return null;
  }

  return (
    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          <span className="text-green-800 dark:text-green-200 font-medium">
            {allComplete ? 'SOL Agent Setup Complete' : 'SOL Agent Partially Configured'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onViewHistory && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory();
              }}
              className="flex items-center gap-1 text-sm text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 transition-colors"
            >
              <History className="w-4 h-4" />
              History
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-green-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-green-600" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center text-sm">
            <Sun className={`w-4 h-4 mr-2 ${setupStatus.solar ? 'text-green-600' : 'text-gray-400'}`} />
            <span className={setupStatus.solar ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'}>
              Solar Business Configuration
            </span>
            {setupStatus.solar && <CheckCircle className="w-4 h-4 ml-auto text-green-600" />}
          </div>
          
          <div className="flex items-center text-sm">
            <Calendar className={`w-4 h-4 mr-2 ${setupStatus.calendar ? 'text-green-600' : 'text-gray-400'}`} />
            <span className={setupStatus.calendar ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'}>
              Calendar Setup
            </span>
            {setupStatus.calendar && <CheckCircle className="w-4 h-4 ml-auto text-green-600" />}
          </div>
          
          <div className="flex items-center text-sm">
            <Bell className={`w-4 h-4 mr-2 ${setupStatus.notifications ? 'text-green-600' : 'text-gray-400'}`} />
            <span className={setupStatus.notifications ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'}>
              Notification Preferences
            </span>
            {setupStatus.notifications && <CheckCircle className="w-4 h-4 ml-auto text-green-600" />}
          </div>

          {allComplete && (
            <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/40 rounded text-sm text-green-800 dark:text-green-200">
              🎉 Your Solar Sales Specialist is fully configured and ready to help customers!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SetupStatusIndicator;