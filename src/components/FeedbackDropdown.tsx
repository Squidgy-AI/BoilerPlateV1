// src/components/FeedbackDropdown.tsx
'use client';

import React, { useState } from 'react';
import { Heart, Phone, X, MessageSquare, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/utils/getUserId';

interface FeedbackDropdownProps {
  isVisible: boolean;
  onClose: () => void;
  onResponse: (response: string, wantsCall: boolean) => void;
  isResend?: boolean; // Is this a resend reminder?
}

const FeedbackDropdown: React.FC<FeedbackDropdownProps> = ({
  isVisible,
  onClose,
  onResponse,
  isResend = false
}) => {
  const [selectedResponse, setSelectedResponse] = useState<string>('');
  const [wantsCall, setWantsCall] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCallOptions, setShowCallOptions] = useState(false);

  const feedbackOptions = [
    {
      id: 'loving_it',
      text: '❤️ Loving it! This is exactly what I needed',
      icon: Heart,
      color: 'text-green-600'
    },
    {
      id: 'pretty_good',
      text: '👍 Pretty good, but could use some improvements',
      icon: CheckCircle,
      color: 'text-blue-600'
    },
    {
      id: 'okay',
      text: '😐 It\'s okay, still figuring it out',
      icon: Clock,
      color: 'text-yellow-600'
    },
    {
      id: 'not_great',
      text: '😕 Not great, having some issues',
      icon: X,
      color: 'text-red-600'
    }
  ];

  const handleOptionSelect = (optionId: string) => {
    setSelectedResponse(optionId);
    setShowCallOptions(true);
  };

  const handleSubmit = async () => {
    if (!selectedResponse) return;

    setIsSubmitting(true);
    
    try {
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        throw new Error('Failed to get user ID');
      }

      // Get the current timestamp
      const now = new Date().toISOString();
      
      // Determine which response field to update based on whether this is a resend
      const updateData = isResend ? {
        second_reminder_responded_at: now,
        second_reminder_response: selectedResponse,
        wants_feedback_call: wantsCall
      } : {
        first_reminder_responded_at: now,
        first_reminder_response: selectedResponse,
        wants_feedback_call: wantsCall
      };

      // Update the feedback record
      const { error } = await supabase
        .from('followup_feedback_on_firm_user')
        .update({
          ...updateData,
          updated_at: now
        })
        .eq('firm_user_id', userIdResult.user_id);

      if (error) {
        throw error;
      }

      console.log('✅ Feedback response saved:', { selectedResponse, wantsCall, isResend });
      
      // Call the parent callback
      onResponse(selectedResponse, wantsCall);
      
      // Close the dropdown
      onClose();
      
    } catch (error) {
      console.error('Failed to save feedback response:', error);
      // Still close the dropdown even if save fails
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    try {
      const userIdResult = await getUserId();
      if (userIdResult.success && userIdResult.user_id) {
        // Mark as dismissed without response
        const now = new Date().toISOString();
        const updateData = isResend ? {
          second_reminder_responded_at: now,
          second_reminder_response: 'dismissed'
        } : {
          first_reminder_responded_at: now,
          first_reminder_response: 'dismissed'
        };

        await supabase
          .from('followup_feedback_on_firm_user')
          .update({
            ...updateData,
            updated_at: now
          })
          .eq('firm_user_id', userIdResult.user_id);
      }
    } catch (error) {
      console.error('Failed to save dismissal:', error);
    }
    
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <h3 className="font-semibold">
                {isResend ? 'Quick Check-in' : 'How are you enjoying Squidgy?'}
              </h3>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-blue-100 mt-1">
            {isResend 
              ? 'We\'d still love to hear your thoughts!' 
              : 'Your feedback helps us improve Squidgy for everyone'
            }
          </p>
        </div>

        {/* Content */}
        <div className="p-4">
          {!showCallOptions ? (
            /* Step 1: Feedback Selection */
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-3">
                How would you rate your experience so far?
              </p>
              {feedbackOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleOptionSelect(option.id)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <IconComponent className={`w-4 h-4 ${option.color}`} />
                      <span className="text-sm text-gray-700 group-hover:text-blue-700">
                        {option.text}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Step 2: Call Scheduling Option */
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Thanks for your feedback!</span>
              </div>
              
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Would you like to schedule a quick call with Seth to discuss your feedback?
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  This helps us understand your needs better and improve Squidgy based on real user experiences.
                </p>
                
                <div className="space-y-2">
                  <button
                    onClick={() => setWantsCall(true)}
                    className={`w-full p-3 border rounded-lg transition-colors flex items-center space-x-3 ${
                      wantsCall 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    <span className="text-sm font-medium">Yes, schedule a call with Seth</span>
                  </button>
                  
                  <button
                    onClick={() => setWantsCall(false)}
                    className={`w-full p-3 border rounded-lg transition-colors flex items-center space-x-3 ${
                      !wantsCall 
                        ? 'border-gray-400 bg-gray-50 text-gray-700' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm font-medium">No thanks, just wanted to share feedback</span>
                  </button>
                </div>
              </div>
              
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setShowCallOptions(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            You can disable these reminders in settings
          </p>
        </div>
      </div>
    </div>
  );
};

export default FeedbackDropdown;