// src/components/EnhancedChatNotificationSetup.tsx
'use client';

import React, { useState } from 'react';
import { Bell, Mail, MessageSquare, Phone, MessageCircle, Check } from 'lucide-react';
import { NotificationPreferences as NotificationPrefsType } from '@/config/calendarNotificationConfig';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/utils/getUserId';

interface EnhancedChatNotificationSetupProps {
  onComplete: (prefs: NotificationPrefsType) => void;
  onSkip?: () => void;
  sessionId?: string;
}

const EnhancedChatNotificationSetup: React.FC<EnhancedChatNotificationSetupProps> = ({
  onComplete,
  onSkip,
  sessionId
}) => {
  const [isSaving, setSaving] = useState(false);
  
  // Default notification preferences with smart defaults
  const [prefs, setPrefs] = useState<NotificationPrefsType>({
    email_enabled: true,
    email_address: "contact@solarsolutions.com",
    sms_enabled: false, // Disabled by default
    phone_number: "+1 (555) 123-4567",
    whatsapp_enabled: false, // Disabled 
    whatsapp_number: "",
    fb_messenger_enabled: true, // Enabled by default
    ghl_app_enabled: false, // Disabled
    reminder_hours_before: 24,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    timezone: 'America/New_York',
    // Notification types for each channel
    email_booking: true,
    email_reminder: true,
    email_cancellation: true,
    email_reschedule: true,
    sms_booking: false,
    sms_reminder: false,
    sms_cancellation: false,
    sms_reschedule: false,
    whatsapp_booking: false,
    whatsapp_reminder: false,
    whatsapp_cancellation: false,
    whatsapp_reschedule: false
  });

  const notificationChannels = [
    {
      id: 'email',
      name: 'Email',
      icon: Mail,
      enabled: true,
      description: 'Professional email notifications',
      field: 'email_enabled' as keyof NotificationPrefsType,
      contactField: 'email_address' as keyof NotificationPrefsType,
      placeholder: 'your-email@company.com'
    },
    {
      id: 'fb_messenger',
      name: 'Facebook Messenger',
      icon: MessageCircle,
      enabled: true,
      description: 'Chat via Facebook Messenger',
      field: 'fb_messenger_enabled' as keyof NotificationPrefsType,
      contactField: null,
      placeholder: null
    },
    {
      id: 'sms',
      name: 'SMS',
      icon: MessageSquare,
      enabled: false,
      description: 'Text message notifications',
      field: 'sms_enabled' as keyof NotificationPrefsType,
      contactField: 'phone_number' as keyof NotificationPrefsType,
      placeholder: '+1 (555) 123-4567'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: Phone,
      enabled: false,
      description: 'WhatsApp business messages',
      field: 'whatsapp_enabled' as keyof NotificationPrefsType,
      contactField: 'whatsapp_number' as keyof NotificationPrefsType,
      placeholder: '+1 (555) 123-4567'
    },
    {
      id: 'ghl_app',
      name: 'GHL App',
      icon: Bell,
      enabled: false,
      description: 'GoHighLevel app notifications',
      field: 'ghl_app_enabled' as keyof NotificationPrefsType,
      contactField: null,
      placeholder: null
    }
  ];

  const handleChannelToggle = (channelId: string, enabled: boolean) => {
    const channel = notificationChannels.find(c => c.id === channelId);
    if (!channel || !channel.enabled) return; // Can't toggle disabled channels
    
    setPrefs(prev => ({ ...prev, [channel.field]: enabled }));
  };

  const handleContactInfoChange = (field: keyof NotificationPrefsType, value: string) => {
    setPrefs(prev => ({ ...prev, [field]: value }));
  };

  const saveToDatabase = async (notificationPrefs: NotificationPrefsType, sessionId?: string) => {
    try {
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        throw new Error('Failed to get user ID');
      }

      // Use direct Supabase calls with proper setup_type field
      const { supabase } = await import('@/lib/supabase');
      
      // Critical NULL checks for composite primary key fields
      const firm_user_id = userIdResult.user_id;
      const agent_id = 'SOLAgent';
      const setup_type = 'NotificationSetup';
      
      if (!firm_user_id) {
        console.error('🚨 CRITICAL: firm_user_id is NULL - this will break the upsert!');
        throw new Error('firm_user_id cannot be NULL');
      }
      if (!agent_id) {
        console.error('🚨 CRITICAL: agent_id is NULL - this will break the upsert!');
        throw new Error('agent_id cannot be NULL');
      }
      if (!setup_type) {
        console.error('🚨 CRITICAL: setup_type is NULL - this will break the upsert!');
        throw new Error('setup_type cannot be NULL');
      }

      console.log('✅ Notification Setup - Primary key validation passed:', { firm_user_id, agent_id, setup_type });
      console.log('🔔 session_id:', sessionId && sessionId.includes('_') ? null : sessionId);
      
      // Upsert into public schema table using profile.user_id with proper conflict resolution
      const { data, error } = await supabase
        .from('squidgy_agent_business_setup')
        .upsert({
          firm_id: null,
          firm_user_id,
          agent_id,
          agent_name: 'Solar Sales Specialist',
          setup_type,
          setup_json: notificationPrefs,
          session_id: sessionId && sessionId.includes('_') ? null : sessionId,
          is_enabled: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'firm_user_id,agent_id,setup_type',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('🚨 Database error in Notification Setup:', error);
        console.error('🔍 Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('✅ Notification preferences saved to database:', data);
      return data;
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      throw error;
    }
  };

  const handleComplete = async () => {
    try {
      setSaving(true);
      
      // Save to database
      await saveToDatabase(prefs, sessionId);
      
      // Save to localStorage as backup
      localStorage.setItem('notification_preferences', JSON.stringify(prefs));
      
      setSaving(false);
      onComplete(prefs);
    } catch (error) {
      console.error('Failed to complete notification setup:', error);
      setSaving(false);
      // Still call onComplete to not block the user
      onComplete(prefs);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 max-w-sm">
      <div className="flex items-center mb-4">
        <Bell className="text-purple-500 mr-2" size={20} />
        <h3 className="font-semibold text-gray-800">Notification Setup</h3>
      </div>
      
      <div className="space-y-4 mb-4">
        {/* Channel Selection */}
        <div>
          <h4 className="font-medium text-gray-800 mb-3">Notification Channels</h4>
          <div className="grid grid-cols-2 gap-2">
            {notificationChannels.map((channel) => {
              const IconComponent = channel.icon;
              const isChannelEnabled = prefs[channel.field] as boolean;
              const canToggle = channel.enabled;
              
              return (
                <div
                  key={channel.id}
                  className={`relative p-3 border rounded-lg cursor-pointer transition-all ${
                    canToggle
                      ? isChannelEnabled
                        ? 'border-purple-500 bg-purple-100'
                        : 'border-gray-300 bg-white hover:border-purple-300'
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  }`}
                  onClick={() => canToggle && handleChannelToggle(channel.id, !isChannelEnabled)}
                >
                  <div className="flex items-center space-x-2">
                    <IconComponent 
                      size={16} 
                      className={`${
                        canToggle 
                          ? isChannelEnabled 
                            ? 'text-purple-600' 
                            : 'text-gray-600'
                          : 'text-gray-400'
                      }`} 
                    />
                    <span className={`text-sm font-medium ${
                      canToggle ? 'text-gray-800' : 'text-gray-400'
                    }`}>
                      {channel.name}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${
                    canToggle ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    {channel.description}
                  </p>
                  
                  {/* Selection indicator */}
                  {canToggle && isChannelEnabled && (
                    <div className="absolute top-1 right-1">
                      <Check size={12} className="text-purple-600" />
                    </div>
                  )}
                  
                  {/* Disabled overlay */}
                  {!canToggle && (
                    <div className="absolute inset-0 flex items-end justify-center bg-gray-100 bg-opacity-50 rounded-lg pointer-events-none">
                      <span className="text-xs text-gray-600 font-semibold bg-gray-200 px-2 py-1 rounded mb-1">Coming Soon</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact Information for enabled channels */}
        <div className="space-y-3">
          {prefs.email_enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={prefs.email_address}
                onChange={(e) => handleContactInfoChange('email_address', e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm text-gray-900 bg-white"
                placeholder="your-email@company.com"
              />
            </div>
          )}
          
          {prefs.sms_enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={prefs.phone_number}
                onChange={(e) => handleContactInfoChange('phone_number', e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm text-gray-900 bg-white"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          )}
        </div>

        {/* Notification Types */}
        <div className="bg-white p-3 rounded-md border">
          <h4 className="font-medium text-gray-800 mb-2">Notification Types</h4>
          <div className="space-y-2">
            <label className="flex items-center text-sm text-gray-800">
              <input 
                type="checkbox" 
                className="mr-2 text-purple-600" 
                defaultChecked 
              />
              Appointment confirmations
            </label>
            <label className="flex items-center text-sm text-gray-800">
              <input 
                type="checkbox" 
                className="mr-2 text-purple-600" 
                defaultChecked 
              />
              Appointment reminders (24hrs before)
            </label>
            <label className="flex items-center text-sm text-gray-800">
              <input 
                type="checkbox" 
                className="mr-2 text-purple-600" 
                defaultChecked 
              />
              Cancellations & reschedules
            </label>
          </div>
        </div>

        {/* Active channels summary */}
        <div className="bg-green-50 p-2 rounded border">
          <div className="flex items-center text-xs text-green-700">
            <Check className="w-3 h-3 mr-1" />
            Active: {notificationChannels.filter(c => prefs[c.field] as boolean).map(c => c.name).join(', ')}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleComplete}
          disabled={isSaving}
          className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center disabled:opacity-50"
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
        
        {/* Skip removed for mandatory setup */}
      </div>
    </div>
  );
};

export default EnhancedChatNotificationSetup;