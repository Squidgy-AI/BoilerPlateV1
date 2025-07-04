// src/components/ChatNotificationSetup.tsx
'use client';

import React, { useState } from 'react';
import { Bell, Mail, MessageSquare, Check } from 'lucide-react';
import { NotificationPreferences as NotificationPrefsType } from '@/config/calendarNotificationConfig';

interface ChatNotificationSetupProps {
  onComplete: (prefs: NotificationPrefsType) => void;
  onSkip?: () => void;
}

const ChatNotificationSetup: React.FC<ChatNotificationSetupProps> = ({
  onComplete,
  onSkip
}) => {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleStartConfiguration = () => {
    setIsConfiguring(true);
  };

  const handleComplete = () => {
    const prefs: NotificationPrefsType = {
      email_enabled: !!email,
      email_address: email,
      sms_enabled: !!phone,
      phone_number: phone,
      whatsapp_enabled: false,
      whatsapp_number: '',
      fb_messenger_enabled: true,
      ghl_app_enabled: true,
      reminder_hours_before: 24,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      timezone: 'America/New_York',
      // Notification types for each channel
      email_booking: true,
      email_reminder: true,
      email_cancellation: true,
      email_reschedule: true,
      sms_booking: !!phone,
      sms_reminder: !!phone,
      sms_cancellation: !!phone,
      sms_reschedule: !!phone,
      whatsapp_booking: false,
      whatsapp_reminder: false,
      whatsapp_cancellation: false,
      whatsapp_reschedule: false
    };
    
    setIsConfiguring(false);
    onComplete(prefs);
  };

  if (isConfiguring) {
    return (
      <div className="bg-white rounded-lg border p-4 max-w-sm">
        <div className="flex items-center mb-3">
          <Bell className="text-purple-500 mr-2" size={20} />
          <h3 className="font-semibold text-gray-800">Notification Setup</h3>
        </div>
        
        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-gray-600 mb-1">Email Address</label>
            <input 
              type="email" 
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="your-email@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-gray-600 mb-1">Phone Number (optional)</label>
            <input 
              type="tel" 
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          
          <div className="bg-gray-50 p-3 rounded-md">
            <h4 className="font-medium text-gray-800 mb-2">Notification Types</h4>
            <div className="space-y-1">
              <label className="flex items-center text-sm">
                <input type="checkbox" className="mr-2" defaultChecked />
                Appointment confirmations
              </label>
              <label className="flex items-center text-sm">
                <input type="checkbox" className="mr-2" defaultChecked />
                Appointment reminders
              </label>
              <label className="flex items-center text-sm">
                <input type="checkbox" className="mr-2" defaultChecked />
                Cancellations & changes
              </label>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            <div className="flex items-center">
              <Check className="w-3 h-3 text-green-500 mr-1" />
              Chat notifications always enabled
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleComplete}
            className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            disabled={!email}
          >
            Save Preferences
          </button>
          <button
            onClick={onSkip}
            className="px-3 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-md text-sm transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 max-w-sm">
      <div className="flex items-start space-x-3">
        <div className="bg-purple-500 rounded-full p-2 flex-shrink-0">
          <Bell className="text-white" size={16} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Notification Setup 🔔
          </h3>
          
          <p className="text-gray-700 text-sm mb-3 leading-relaxed">
            Choose how you'd like to receive appointment notifications and reminders.
          </p>
          
          <ul className="space-y-1 text-gray-700 text-sm mb-4">
            <li className="flex items-center">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></div>
              <span>Email notifications</span>
            </li>
            <li className="flex items-center">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></div>
              <span>SMS reminders</span>
            </li>
            <li className="flex items-center">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></div>
              <span>Chat preferences</span>
            </li>
          </ul>

          <div className="flex gap-2">
            <button
              onClick={handleStartConfiguration}
              className="flex items-center justify-center space-x-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <Mail size={14} />
              <span>Setup Notifications</span>
            </button>
            
            <button
              onClick={onSkip}
              className="px-3 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-md text-sm transition-colors"
            >
              Skip
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            💡 Stay updated on all appointment activity
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatNotificationSetup;