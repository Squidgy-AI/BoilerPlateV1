// src/components/FeedbackReminderConfig.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Save, X, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/utils/getUserId';

interface FeedbackConfig {
  initial_reminder_minutes: number;
  resend_reminder_minutes: number;
  is_disabled: boolean;
}

interface FeedbackReminderConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdate?: (config: FeedbackConfig) => void;
}

const FeedbackReminderConfig: React.FC<FeedbackReminderConfigProps> = ({
  isOpen,
  onClose,
  onConfigUpdate
}) => {
  const [config, setConfig] = useState<FeedbackConfig>({
    initial_reminder_minutes: 2,
    resend_reminder_minutes: 5,
    is_disabled: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Load existing configuration
  useEffect(() => {
    if (isOpen) {
      loadConfiguration();
    }
  }, [isOpen]);

  const loadConfiguration = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        throw new Error('Failed to get user ID');
      }

      // Check if user has existing feedback configuration
      const { data, error } = await supabase
        .from('followup_feedback_on_firm_user')
        .select('initial_reminder_minutes, resend_reminder_minutes, is_disabled')
        .eq('firm_user_id', userIdResult.user_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is fine for first-time users
        throw error;
      }

      if (data) {
        setConfig({
          initial_reminder_minutes: data.initial_reminder_minutes,
          resend_reminder_minutes: data.resend_reminder_minutes,
          is_disabled: data.is_disabled
        });
      }
    } catch (error) {
      console.error('Failed to load feedback configuration:', error);
      setError('Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      setIsSaving(true);
      setError('');

      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        throw new Error('Failed to get user ID');
      }

      // Upsert the configuration
      const { error } = await supabase
        .from('followup_feedback_on_firm_user')
        .upsert({
          firm_user_id: userIdResult.user_id,
          initial_reminder_minutes: config.initial_reminder_minutes,
          resend_reminder_minutes: config.resend_reminder_minutes,
          is_disabled: config.is_disabled,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'firm_user_id',
          ignoreDuplicates: false
        });

      if (error) {
        throw error;
      }

      console.log('✅ Feedback reminder configuration saved:', config);
      
      // Notify parent component of config update
      if (onConfigUpdate) {
        onConfigUpdate(config);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to save feedback configuration:', error);
      setError('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof FeedbackConfig, value: number | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Feedback Reminder Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-600">Loading configuration...</div>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Enable Feedback Reminders
                  </label>
                  <button
                    onClick={() => handleInputChange('is_disabled', !config.is_disabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.is_disabled ? 'bg-gray-200' : 'bg-blue-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.is_disabled ? 'translate-x-1' : 'translate-x-6'
                      }`}
                    />
                  </button>
                </div>

                {!config.is_disabled && (
                  <>
                    {/* Initial Reminder Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Initial Reminder After (minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={config.initial_reminder_minutes}
                        onChange={(e) => handleInputChange('initial_reminder_minutes', parseInt(e.target.value) || 2)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        placeholder="2"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Show feedback reminder after this many minutes of activity
                      </p>
                    </div>

                    {/* Resend Reminder Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Resend Reminder After (minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={config.resend_reminder_minutes}
                        onChange={(e) => handleInputChange('resend_reminder_minutes', parseInt(e.target.value) || 5)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        placeholder="5"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Resend reminder if no response after this many minutes
                      </p>
                    </div>
                  </>
                )}

                {/* Preview */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Preview:</h4>
                  <p className="text-xs text-blue-700">
                    {config.is_disabled ? (
                      'Feedback reminders are disabled'
                    ) : (
                      `Show reminder after ${config.initial_reminder_minutes} minute${config.initial_reminder_minutes !== 1 ? 's' : ''}, resend after ${config.resend_reminder_minutes} minute${config.resend_reminder_minutes !== 1 ? 's' : ''} if no response`
                    )}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveConfiguration}
            disabled={isSaving || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackReminderConfig;