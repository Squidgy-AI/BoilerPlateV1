// src/components/ChatCalendarSetup.tsx
'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Check } from 'lucide-react';
import { CalendarSetup as CalendarSetupType } from '@/config/calendarNotificationConfig';

interface ChatCalendarSetupProps {
  onComplete: (setup: CalendarSetupType) => void;
  onSkip?: () => void;
}

const ChatCalendarSetup: React.FC<ChatCalendarSetupProps> = ({
  onComplete,
  onSkip
}) => {
  const [isConfiguring, setIsConfiguring] = useState(false);

  const handleStartConfiguration = () => {
    setIsConfiguring(true);
  };

  const handleComplete = () => {
    const setup: CalendarSetupType = {
      calendar_name: "Solar Consultations",
      description: "Schedule solar consultations and site visits",
      calendar_type: "consultation",
      slot_duration: 60,
      slot_interval: 15,
      slot_buffer: 15,
      pre_buffer: 10,
      availability_type: "business_hours",
      business_hours: {
        monday: { enabled: true, start: "09:00", end: "17:00" },
        tuesday: { enabled: true, start: "09:00", end: "17:00" },
        wednesday: { enabled: true, start: "09:00", end: "17:00" },
        thursday: { enabled: true, start: "09:00", end: "17:00" },
        friday: { enabled: true, start: "09:00", end: "17:00" },
        saturday: { enabled: false, start: "09:00", end: "17:00" },
        sunday: { enabled: false, start: "09:00", end: "17:00" }
      },
      allow_booking_after: 24,
      allow_booking_for: 30,
      appointments_per_day: null,
      auto_confirm: true,
      allow_reschedule: true,
      allow_cancellation: true,
      enable_recurring: false,
      confirmation_message: "Your solar consultation has been confirmed!",
      cancellation_policy: "Please provide 24 hours notice for cancellations."
    };
    
    setIsConfiguring(false);
    onComplete(setup);
  };

  if (isConfiguring) {
    return (
      <div className="bg-white rounded-lg border p-4 max-w-sm">
        <div className="flex items-center mb-3">
          <Calendar className="text-blue-500 mr-2" size={20} />
          <h3 className="font-semibold text-gray-800">Calendar Setup</h3>
        </div>
        
        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-gray-600 mb-1">Calendar Name</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border rounded-md text-sm text-gray-900 bg-white"
              defaultValue="Solar Consultations"
            />
          </div>
          
          <div>
            <label className="block text-gray-600 mb-1">Appointment Duration</label>
            <select className="w-full px-3 py-2 border rounded-md text-sm text-gray-900 bg-white">
              <option value="30">30 minutes</option>
              <option value="60" selected>60 minutes</option>
              <option value="90">90 minutes</option>
              <option value="120">2 hours</option>
            </select>
          </div>
          
          <div>
            <label className="block text-gray-600 mb-1">Business Hours</label>
            <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded border">
              <div className="font-medium mb-1">Default Schedule:</div>
              <div>Monday - Friday: 9:00 AM - 5:00 PM</div>
              <div className="text-xs text-gray-500 mt-1">Weekends: Closed</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center text-sm text-gray-700">
              <input type="checkbox" className="mr-2 text-blue-600" defaultChecked />
              Auto-confirm appointments
            </label>
            <label className="flex items-center text-sm text-gray-700">
              <input type="checkbox" className="mr-2 text-blue-600" defaultChecked />
              Allow rescheduling
            </label>
            <label className="flex items-center text-sm text-gray-700">
              <input type="checkbox" className="mr-2 text-blue-600" defaultChecked />
              24-hour cancellation notice required
            </label>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleComplete}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Save Calendar
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
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 max-w-sm">
      <div className="flex items-start space-x-3">
        <div className="bg-blue-500 rounded-full p-2 flex-shrink-0">
          <Calendar className="text-white" size={16} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Calendar Setup 📅
          </h3>
          
          <p className="text-gray-700 text-sm mb-3 leading-relaxed">
            Configure your booking system so customers can schedule consultations directly.
          </p>
          
          <ul className="space-y-1 text-gray-700 text-sm mb-4">
            <li className="flex items-center">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
              <span>Business hours</span>
            </li>
            <li className="flex items-center">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
              <span>Appointment duration</span>
            </li>
            <li className="flex items-center">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
              <span>Booking preferences</span>
            </li>
          </ul>

          <div className="flex gap-2">
            <button
              onClick={handleStartConfiguration}
              className="flex items-center justify-center space-x-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <Clock size={14} />
              <span>Setup Calendar</span>
            </button>
            
            <button
              onClick={onSkip}
              className="px-3 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-md text-sm transition-colors"
            >
              Skip
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            💡 Customers can book appointments via chat
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatCalendarSetup;