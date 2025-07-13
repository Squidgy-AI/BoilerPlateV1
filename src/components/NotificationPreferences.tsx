// src/components/NotificationPreferences.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Phone, Clock, Check } from 'lucide-react';
import {
  NotificationPreferences as NotificationPrefsType,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
  getNotificationPreferences,
  saveNotificationPreferences
} from '@/config/calendarNotificationConfig';

interface NotificationPreferencesProps {
  onComplete: (prefs: NotificationPrefsType) => void;
  onSkip?: () => void;
  initialPreferences?: NotificationPrefsType;
}

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  onComplete,
  onSkip,
  initialPreferences
}) => {
  const [prefs, setPrefs] = useState<NotificationPrefsType>(
    initialPreferences || getNotificationPreferences()
  );
  const [activeTab, setActiveTab] = useState<'channels' | 'types' | 'timing'>('channels');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateContactInfo = () => {
    const errors: Record<string, string> = {};

    if (prefs.email_enabled && !prefs.email_address) {
      errors.email = 'Email address is required';
    } else if (prefs.email_enabled && !isValidEmail(prefs.email_address)) {
      errors.email = 'Please enter a valid email address';
    }

    if (prefs.sms_enabled && !prefs.phone_number) {
      errors.sms = 'Phone number is required';
    } else if (prefs.sms_enabled && !isValidPhone(prefs.phone_number)) {
      errors.sms = 'Please enter a valid phone number';
    }

    if (prefs.whatsapp_enabled && !prefs.whatsapp_number) {
      errors.whatsapp = 'WhatsApp number is required';
    } else if (prefs.whatsapp_enabled && !isValidPhone(prefs.whatsapp_number)) {
      errors.whatsapp = 'Please enter a valid WhatsApp number';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPhone = (phone: string) => {
    return /^\+?[1-9]\d{1,14}$/.test(phone.replace(/[\s()-]/g, ''));
  };

  const handleChannelToggle = (channelKey: keyof NotificationPrefsType) => {
    // Don't allow toggling Facebook Messenger or GHL App
    if (channelKey === 'fb_messenger_enabled' || channelKey === 'ghl_app_enabled') {
      return;
    }
    setPrefs(prev => ({ ...prev, [channelKey]: !prev[channelKey] }));
  };

  const handleContactInfoChange = (field: keyof NotificationPrefsType, value: string) => {
    setPrefs(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user types
    if (validationErrors[field.replace('_address', '').replace('_number', '')]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field.replace('_address', '').replace('_number', '')];
        return newErrors;
      });
    }
  };

  const handleNotificationTypeToggle = (channel: string, type: string) => {
    const key = `${channel}_${type}` as keyof NotificationPrefsType;
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!validateContactInfo()) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Save to localStorage immediately
      await saveNotificationPreferences(prefs);

      // Save to database
      const response = await fetch('/api/save-notification-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save notification preferences');
      }

      console.log('✅ Notification preferences saved successfully!');
      onComplete(prefs);
    } catch (error) {
      console.error('❌ Failed to save notification preferences:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const getChannelIcon = (channelId: string) => {
    switch (channelId) {
      case 'email': return <Mail className="w-5 h-5" />;
      case 'sms': return <MessageSquare className="w-5 h-5" />;
      case 'whatsapp': return <Phone className="w-5 h-5" />;
      case 'fb_messenger': return <MessageSquare className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex items-center mb-8">
          <Bell className="w-8 h-8 text-purple-500 mr-3" />
          <h2 className="text-2xl font-bold">Notification Preferences</h2>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-8 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('channels')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'channels'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Notification Channels
          </button>
          <button
            onClick={() => setActiveTab('types')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'types'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Notification Types
          </button>
          <button
            onClick={() => setActiveTab('timing')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'timing'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Timing & Schedule
          </button>
        </div>

        {/* Channels Tab */}
        {activeTab === 'channels' && (
          <div className="space-y-6">
            {NOTIFICATION_CHANNELS.map(channel => (
              <div key={channel.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    {getChannelIcon(channel.id)}
                    <span className="ml-3 font-medium">{channel.label}</span>
                    {channel.locked && (
                      <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">
                        Always Enabled
                      </span>
                    )}
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs[channel.enabled_key as keyof NotificationPrefsType] as boolean}
                      onChange={() => handleChannelToggle(channel.enabled_key as keyof NotificationPrefsType)}
                      disabled={channel.locked}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {channel.contact_field && prefs[channel.enabled_key as keyof NotificationPrefsType] && (
                  <div>
                    <input
                      type={channel.id === 'email' ? 'email' : 'tel'}
                      value={prefs[channel.contact_field as keyof NotificationPrefsType] as string}
                      onChange={(e) => handleContactInfoChange(channel.contact_field as keyof NotificationPrefsType, e.target.value)}
                      placeholder={channel.placeholder}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                        validationErrors[channel.id] ? 'border-red-500' : ''
                      }`}
                    />
                    {validationErrors[channel.id] && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors[channel.id]}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Notification Types Tab */}
        {activeTab === 'types' && (
          <div className="space-y-6">
            <p className="text-gray-600 mb-4">
              Choose which types of notifications you want to receive on each channel.
            </p>

            {NOTIFICATION_CHANNELS.filter(ch => 
              prefs[ch.enabled_key as keyof NotificationPrefsType] && ch.id !== 'fb_messenger'
            ).map(channel => (
              <div key={channel.id} className="border rounded-lg p-4">
                <div className="flex items-center mb-3">
                  {getChannelIcon(channel.id)}
                  <span className="ml-2 font-medium">{channel.label}</span>
                </div>
                <div className="space-y-2 ml-7">
                  {NOTIFICATION_TYPES.map(type => (
                    <label key={type.key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={prefs[`${channel.id}_${type.key}` as keyof NotificationPrefsType] as boolean}
                        onChange={() => handleNotificationTypeToggle(channel.id, type.key)}
                        className="w-4 h-4 text-purple-600 mr-3"
                      />
                      <span className="text-sm">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* Facebook Messenger - Always all types */}
            {prefs.fb_messenger_enabled && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center mb-3">
                  {getChannelIcon('fb_messenger')}
                  <span className="ml-2 font-medium">Facebook Messenger</span>
                  <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">
                    All Notifications Enabled
                  </span>
                </div>
                <p className="text-sm text-gray-600 ml-7">
                  Facebook Messenger will receive all notification types by default.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Timing Tab */}
        {activeTab === 'timing' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Send Reminders Before Appointment
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={prefs.reminder_hours_before}
                  onChange={(e) => setPrefs(prev => ({ 
                    ...prev, 
                    reminder_hours_before: parseInt(e.target.value) || 24 
                  }))}
                  className="w-24 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  min="1"
                  max="72"
                />
                <span className="ml-3">hours before</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Quiet Hours
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Don't send notifications during these hours
              </p>
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <input
                    type="time"
                    value={prefs.quiet_hours_start || ''}
                    onChange={(e) => setPrefs(prev => ({ 
                      ...prev, 
                      quiet_hours_start: e.target.value 
                    }))}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input
                    type="time"
                    value={prefs.quiet_hours_end || ''}
                    onChange={(e) => setPrefs(prev => ({ 
                      ...prev, 
                      quiet_hours_end: e.target.value 
                    }))}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Timezone
              </label>
              <select
                value={prefs.timezone}
                onChange={(e) => setPrefs(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="America/Phoenix">Arizona Time</option>
                <option value="Pacific/Honolulu">Hawaii Time</option>
              </select>
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
              disabled={isSaving || Object.keys(validationErrors).length > 0}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Save Preferences
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;