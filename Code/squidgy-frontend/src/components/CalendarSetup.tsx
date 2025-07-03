// src/components/CalendarSetup.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Settings, Check } from 'lucide-react';
import {
  CalendarSetup as CalendarSetupType,
  BusinessHours,
  DayHours,
  DEFAULT_CALENDAR_SETUP,
  CALENDAR_TYPES,
  getCalendarSetup,
  saveCalendarSetup
} from '@/config/calendarNotificationConfig';

interface CalendarSetupProps {
  onComplete: (setup: CalendarSetupType) => void;
  onSkip?: () => void;
  initialSetup?: CalendarSetupType;
}

const CalendarSetup: React.FC<CalendarSetupProps> = ({
  onComplete,
  onSkip,
  initialSetup
}) => {
  const [setup, setSetup] = useState<CalendarSetupType>(
    initialSetup || getCalendarSetup()
  );
  const [activeTab, setActiveTab] = useState<'basic' | 'hours' | 'rules'>('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const weekDays = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ] as const;

  const handleBasicChange = (field: keyof CalendarSetupType, value: any) => {
    setSetup(prev => ({ ...prev, [field]: value }));
  };

  const handleHoursChange = (day: keyof BusinessHours, field: keyof DayHours, value: any) => {
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

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Save to localStorage immediately
      await saveCalendarSetup(setup);

      // Save to database
      const response = await fetch('/api/save-calendar-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setup)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save calendar setup');
      }

      console.log('✅ Calendar setup saved successfully!');
      onComplete(setup);
    } catch (error) {
      console.error('❌ Failed to save calendar setup:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex items-center mb-8">
          <Calendar className="w-8 h-8 text-blue-500 mr-3" />
          <h2 className="text-2xl font-bold">Calendar Setup</h2>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-8 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'basic'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Basic Settings
          </button>
          <button
            onClick={() => setActiveTab('hours')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'hours'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Business Hours
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'rules'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Booking Rules
          </button>
        </div>

        {/* Basic Settings Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Calendar Name *
              </label>
              <input
                type="text"
                value={setup.calendar_name}
                onChange={(e) => handleBasicChange('calendar_name', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="My Business Calendar"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={setup.description}
                onChange={(e) => handleBasicChange('description', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe what this calendar is for..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Calendar Type
              </label>
              <select
                value={setup.calendar_type}
                onChange={(e) => handleBasicChange('calendar_type', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {CALENDAR_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Appointment Duration (minutes)
                </label>
                <input
                  type="number"
                  value={setup.slot_duration}
                  onChange={(e) => handleBasicChange('slot_duration', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="15"
                  step="15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Time Between Slots (minutes)
                </label>
                <input
                  type="number"
                  value={setup.slot_interval}
                  onChange={(e) => handleBasicChange('slot_interval', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="15"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Buffer After Appointment (minutes)
                </label>
                <input
                  type="number"
                  value={setup.slot_buffer}
                  onChange={(e) => handleBasicChange('slot_buffer', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Preparation Time Before (minutes)
                </label>
                <input
                  type="number"
                  value={setup.pre_buffer}
                  onChange={(e) => handleBasicChange('pre_buffer', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="5"
                />
              </div>
            </div>
          </div>
        )}

        {/* Business Hours Tab */}
        {activeTab === 'hours' && (
          <div className="space-y-4">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Availability Type
              </label>
              <select
                value={setup.availability_type}
                onChange={(e) => handleBasicChange('availability_type', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="business_hours">Business Hours</option>
                <option value="24_7">24/7 Available</option>
                <option value="custom">Custom Schedule</option>
              </select>
            </div>

            {setup.availability_type === 'business_hours' && (
              <div className="space-y-3">
                {weekDays.map(day => (
                  <div key={day} className="flex items-center space-x-4 p-3 border rounded-lg">
                    <input
                      type="checkbox"
                      checked={setup.business_hours[day].enabled}
                      onChange={(e) => handleHoursChange(day, 'enabled', e.target.checked)}
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="w-24 capitalize font-medium">{day}</span>
                    <input
                      type="time"
                      value={setup.business_hours[day].start}
                      onChange={(e) => handleHoursChange(day, 'start', e.target.value)}
                      disabled={!setup.business_hours[day].enabled}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="time"
                      value={setup.business_hours[day].end}
                      onChange={(e) => handleHoursChange(day, 'end', e.target.value)}
                      disabled={!setup.business_hours[day].enabled}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Booking Rules Tab */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Minimum Notice (hours)
                </label>
                <input
                  type="number"
                  value={setup.allow_booking_after}
                  onChange={(e) => handleBasicChange('allow_booking_after', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Book Up To (days ahead)
                </label>
                <input
                  type="number"
                  value={setup.allow_booking_for}
                  onChange={(e) => handleBasicChange('allow_booking_for', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Maximum Appointments Per Day
              </label>
              <input
                type="number"
                value={setup.appointments_per_day || ''}
                onChange={(e) => handleBasicChange('appointments_per_day', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="No limit"
                min="1"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={setup.auto_confirm}
                  onChange={(e) => handleBasicChange('auto_confirm', e.target.checked)}
                  className="w-5 h-5 mr-3 text-blue-600"
                />
                <span>Auto-confirm appointments</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={setup.allow_reschedule}
                  onChange={(e) => handleBasicChange('allow_reschedule', e.target.checked)}
                  className="w-5 h-5 mr-3 text-blue-600"
                />
                <span>Allow customers to reschedule</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={setup.allow_cancellation}
                  onChange={(e) => handleBasicChange('allow_cancellation', e.target.checked)}
                  className="w-5 h-5 mr-3 text-blue-600"
                />
                <span>Allow customers to cancel</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={setup.enable_recurring}
                  onChange={(e) => handleBasicChange('enable_recurring', e.target.checked)}
                  className="w-5 h-5 mr-3 text-blue-600"
                />
                <span>Enable recurring appointments</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Confirmation Message
              </label>
              <textarea
                value={setup.confirmation_message}
                onChange={(e) => handleBasicChange('confirmation_message', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Cancellation Policy
              </label>
              <textarea
                value={setup.cancellation_policy}
                onChange={(e) => handleBasicChange('cancellation_policy', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {saveError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {saveError}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex justify-between">
          {onSkip && (
            <button
              onClick={onSkip}
              className="px-6 py-2 text-gray-600 hover:text-gray-800"
            >
              Skip for now
            </button>
          )}
          <div className="ml-auto space-x-4">
            <button
              onClick={handleSave}
              disabled={isSaving || !setup.calendar_name}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Save Calendar Setup
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSetup;