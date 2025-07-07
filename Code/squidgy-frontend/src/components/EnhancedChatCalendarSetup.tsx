// src/components/EnhancedChatCalendarSetup.tsx
'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Settings, ArrowRight, Check } from 'lucide-react';
import { CalendarSetup as CalendarSetupType } from '@/config/calendarNotificationConfig';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/utils/getUserId';

interface EnhancedChatCalendarSetupProps {
  onComplete: (setup: CalendarSetupType) => void;
  onSkip?: () => void;
  sessionId?: string;
}

const EnhancedChatCalendarSetup: React.FC<EnhancedChatCalendarSetupProps> = ({
  onComplete,
  onSkip,
  sessionId
}) => {
  const [currentTab, setCurrentTab] = useState<'basic' | 'hours' | 'rules'>('basic');
  const [isSaving, setSaving] = useState(false);
  
  // Default setup data with smart defaults
  const [setup, setSetup] = useState<CalendarSetupType>({
    calendar_name: "Solar Consultations",
    description: "Schedule solar consultations and site visits with potential customers",
    calendar_type: "event",
    slot_duration: 60,
    slot_interval: 15,
    slot_buffer: 15,
    pre_buffer: 10,
    allow_booking_after: 24,
    allow_booking_for: 30,
    appointments_per_day: 8,
    auto_confirm: true,
    allow_reschedule: true,
    allow_cancellation: true,
    enable_recurring: false,
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
    confirmation_message: "Your solar consultation has been confirmed! We'll contact you 24 hours before to confirm details.",
    cancellation_policy: "Please provide at least 24 hours notice for cancellations or rescheduling."
  });

  const handleFieldChange = (field: keyof CalendarSetupType, value: any) => {
    setSetup(prev => ({ ...prev, [field]: value }));
  };

  const handleDayChange = (day: keyof typeof setup.business_hours, field: keyof typeof setup.business_hours.monday, value: any) => {
    setSetup(prev => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: {
          ...prev.business_hours[day],
          [field]: value
        }
      }
    }));
  };

  const saveToDatabase = async (calendarSetup: CalendarSetupType, sessionId?: string) => {
    try {
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        throw new Error('Failed to get user ID');
      }

      // Use backend API instead of direct Supabase calls
      const requestData = {
        user_id: userIdResult.user_id,
        agent_id: 'SOLAgent',
        agent_name: 'Solar Sales Specialist',
        setup_type: 'CalendarSetup',
        setup_data: calendarSetup,
        session_id: sessionId && sessionId.includes('_') ? null : sessionId,
        is_enabled: true
      };
      
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE?.startsWith('http') 
        ? process.env.NEXT_PUBLIC_API_BASE 
        : 'https://squidgy-back-919bc0659e35.herokuapp.com';
      
      const response = await fetch(`${backendUrl}/api/agents/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status !== 'success') {
        throw new Error(result.message || 'Unknown error from backend');
      }
      
      const data = result.agent;

      console.log('✅ Calendar setup saved to database:', data);
      return data;
    } catch (error) {
      console.error('Failed to save calendar setup:', error);
      throw error;
    }
  };

  const handleComplete = async () => {
    try {
      setSaving(true);
      
      // Save to database
      await saveToDatabase(setup, sessionId);
      
      // Save to localStorage as backup
      localStorage.setItem('calendar_setup', JSON.stringify(setup));
      
      setSaving(false);
      onComplete(setup);
    } catch (error) {
      console.error('Failed to complete calendar setup:', error);
      setSaving(false);
      // Still call onComplete to not block the user
      onComplete(setup);
    }
  };

  const renderBasicTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Calendar Name</label>
        <input
          type="text"
          value={setup.calendar_name}
          onChange={(e) => handleFieldChange('calendar_name', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm text-gray-900 bg-white"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <textarea
          value={setup.description}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm text-gray-900 bg-white"
          rows={2}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Duration (min)</label>
          <select
            value={setup.slot_duration}
            onChange={(e) => handleFieldChange('slot_duration', parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded-md text-sm text-gray-900 bg-white"
          >
            <option value={30}>30 minutes</option>
            <option value={60}>60 minutes</option>
            <option value={90}>90 minutes</option>
            <option value={120}>2 hours</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Max per day</label>
          <input
            type="number"
            value={setup.appointments_per_day || ''}
            onChange={(e) => handleFieldChange('appointments_per_day', e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border rounded-md text-sm text-gray-900 bg-white"
            placeholder="8"
          />
        </div>
      </div>
    </div>
  );

  const renderHoursTab = () => (
    <div className="space-y-3">
      <div className="mb-4">
        <h4 className="font-medium text-gray-800 mb-2">Business Hours</h4>
        <p className="text-sm text-gray-600">Set your availability for consultations</p>
      </div>
      
      <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
        {Object.entries(setup.business_hours).map(([day, hours]) => (
          <div key={day} className="border rounded-md bg-white p-4">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                checked={hours.enabled}
                onChange={(e) => handleDayChange(day as keyof typeof setup.business_hours, 'enabled', e.target.checked)}
                className="text-blue-600 mr-2"
              />
              <span className="capitalize text-sm font-semibold text-gray-800">{day}</span>
            </div>
            <div className="space-y-2">
              <input
                type="time"
                value={hours.start}
                onChange={(e) => handleDayChange(day as keyof typeof setup.business_hours, 'start', e.target.value)}
                disabled={!hours.enabled}
                className="w-full px-2 py-1 border rounded text-sm text-gray-900 bg-white disabled:opacity-50 disabled:bg-gray-100"
              />
              <div className="text-center text-gray-500 text-xs">to</div>
              <input
                type="time"
                value={hours.end}
                onChange={(e) => handleDayChange(day as keyof typeof setup.business_hours, 'end', e.target.value)}
                disabled={!hours.enabled}
                className="w-full px-2 py-1 border rounded text-sm text-gray-900 bg-white disabled:opacity-50 disabled:bg-gray-100"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRulesTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notice (hours)</label>
          <input
            type="number"
            value={setup.allow_booking_after}
            onChange={(e) => handleFieldChange('allow_booking_after', parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded-md text-sm text-gray-900 bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Book ahead (days)</label>
          <input
            type="number"
            value={setup.allow_booking_for}
            onChange={(e) => handleFieldChange('allow_booking_for', parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded-md text-sm text-gray-900 bg-white"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="flex items-center text-sm text-gray-800">
          <input
            type="checkbox"
            checked={setup.auto_confirm}
            onChange={(e) => handleFieldChange('auto_confirm', e.target.checked)}
            className="mr-2 text-blue-600"
          />
          Auto-confirm appointments
        </label>
        <label className="flex items-center text-sm text-gray-800">
          <input
            type="checkbox"
            checked={setup.allow_reschedule}
            onChange={(e) => handleFieldChange('allow_reschedule', e.target.checked)}
            className="mr-2 text-blue-600"
          />
          Allow rescheduling
        </label>
        <label className="flex items-center text-sm text-gray-800">
          <input
            type="checkbox"
            checked={setup.allow_cancellation}
            onChange={(e) => handleFieldChange('allow_cancellation', e.target.checked)}
            className="mr-2 text-blue-600"
          />
          Allow cancellations
        </label>
      </div>
    </div>
  );

  const tabs = [
    { id: 'basic', label: 'Basic', icon: Settings },
    { id: 'hours', label: 'Hours', icon: Clock },
    { id: 'rules', label: 'Rules', icon: Calendar }
  ];

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 max-w-sm">
      <div className="flex items-center mb-4">
        <Calendar className="text-blue-500 mr-2" size={20} />
        <h3 className="font-semibold text-gray-800">Calendar Setup</h3>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex mb-4 bg-white rounded-lg p-1">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                currentTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-blue-500'
              }`}
            >
              <IconComponent size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mb-4">
        {currentTab === 'basic' && renderBasicTab()}
        {currentTab === 'hours' && renderHoursTab()}
        {currentTab === 'rules' && renderRulesTab()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-2">
        {currentTab !== 'rules' ? (
          <button
            onClick={() => {
              const nextTab = currentTab === 'basic' ? 'hours' : 'rules';
              setCurrentTab(nextTab);
            }}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
          >
            Next <ArrowRight size={14} className="ml-1" />
          </button>
        ) : (
          <button
            onClick={handleComplete}
            disabled={isSaving}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center disabled:opacity-50"
          >
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Check size={14} className="mr-1" />
                Complete Setup
              </>
            )}
          </button>
        )}
        
        <button
          onClick={onSkip}
          className="px-3 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-md text-sm transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
};

export default EnhancedChatCalendarSetup;