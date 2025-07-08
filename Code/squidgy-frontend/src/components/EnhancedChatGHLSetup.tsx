// src/components/EnhancedChatGHLSetup.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Building2, Users, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/utils/getUserId';

interface EnhancedChatGHLSetupProps {
  onConfigurationComplete: (config: GHLSetupConfig) => void;
  onSkip: () => void;
  sessionId?: string;
}

interface GHLSetupConfig {
  location_id: string;
  user_id: string;
  location_name: string;
  user_name: string;
  user_email: string;
  setup_status: 'pending' | 'creating' | 'completed' | 'failed';
  created_at?: string;
  ghl_login_email?: string;
  ghl_login_password?: string;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  message: string;
  timestamp: Date;
  isAction?: boolean;
  actionType?: 'creation_started' | 'creation_complete' | 'using_existing';
}

const EnhancedChatGHLSetup: React.FC<EnhancedChatGHLSetupProps> = ({
  onConfigurationComplete,
  onSkip,
  sessionId
}) => {
  const [isSaving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      message: 'Hi! Now I need to set up your GoHighLevel account integration. This will create your dedicated sub-account and user credentials for managing your solar business.',
      timestamp: new Date()
    },
    {
      id: '2', 
      sender: 'bot',
      message: 'This process runs in the background and typically takes 30-60 seconds. Your location and user IDs will be used for all future integrations including Facebook, calendars, and customer management.',
      timestamp: new Date()
    }
  ]);
  const [setupStatus, setSetupStatus] = useState<'idle' | 'creating' | 'completed' | 'using_existing'>('idle');
  const [ghlConfig, setGhlConfig] = useState<GHLSetupConfig | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check if we already have GHL credentials
    checkExistingGHLSetup();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (sender: 'bot' | 'user', message: string, isAction = false, actionType?: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender,
      message,
      timestamp: new Date(),
      isAction,
      actionType: actionType as any
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const checkExistingGHLSetup = async () => {
    try {
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        return;
      }

      // Check if GHL setup already exists
      const { data, error } = await supabase
        .from('squidgy_agent_business_setup')
        .select('*')
        .eq('firm_user_id', userIdResult.user_id)
        .eq('agent_id', 'SOLAgent')
        .eq('setup_type', 'GHLSetup')
        .eq('is_enabled', true)
        .single();

      if (!error && data && data.setup_json) {
        const existingConfig = data.setup_json as GHLSetupConfig;
        setGhlConfig(existingConfig);
        setSetupStatus('using_existing');
        
        addMessage('bot', '✅ Found existing GoHighLevel setup!', true, 'using_existing');
        addMessage('bot', `📍 **Location:** ${existingConfig.location_name || existingConfig.location_id}\n👤 **User:** ${existingConfig.user_name || 'Solar Specialist'} (${existingConfig.user_email || 'configured'})\n\nYour GHL integration is already configured and ready to use.`);
      }
    } catch (error) {
      console.error('Error checking existing GHL setup:', error);
    }
  };

  const startGHLCreation = async () => {
    setIsCreating(true);
    setSetupStatus('creating');
    
    addMessage('user', 'Create GoHighLevel Account');
    addMessage('bot', '🚀 Starting GoHighLevel account creation...', true, 'creation_started');
    addMessage('bot', '⏳ This process calls the GoHighLevel API to create your actual sub-account and user credentials.');

    try {
      // Call the real backend API for GHL creation
      await simulateGHLCreation();

    } catch (error: any) {
      console.error('GHL creation error:', error);
      addMessage('bot', `❌ Error creating GHL account: ${error?.message || 'Unknown error'}`);
      setSetupStatus('idle');
    } finally {
      setIsCreating(false);
    }
  };

  const simulateGHLCreation = async () => {
    // Show progress messages
    addMessage('bot', '📋 Creating sub-account in GoHighLevel...');
    
    try {
      // Get backend URL
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://squidgy-back-919bc0659e35.herokuapp.com'
        : 'http://localhost:8000';

      // Generate random number for unique naming
      const randomNum = Math.floor(Math.random() * 1000);
      
      // Prepare request for backend API
      const requestPayload = {
        agency_token: "pit-c4e9d6af-8956-4a84-9b83-554fb6801a69",
        company_id: "lp2p1q27DrdGta1qGDJd",
        phone: "+1-555-SOLAR-1",
        address: "123 Solar Business Ave",
        city: "Solar City",
        state: "CA",
        country: "USA",
        postal_code: "90210",
        timezone: "America/Los_Angeles",
        snapshot_id: "7oAH6Cmto5ZcWAaEsrrq"
      };

      // Call backend API to create sub-account and user
      const response = await fetch(`${backendUrl}/api/ghl/create-subaccount-and-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create GHL account: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.status === 'success') {
        // Extract real location_id from backend response
        const realLocationId = result.subaccount.location_id;
        const realUserId = result.user.user_id;
        
        const realGHLConfig: GHLSetupConfig = {
          location_id: realLocationId,
          user_id: realUserId,
          location_name: `SolarBusiness_${realLocationId}`, // Use location_id in name as you requested
          user_name: result.user.details.name || "Solar Sales Manager",
          user_email: `sa+${randomNum}@squidgy.ai`, // Use your requested format
          setup_status: 'completed',
          created_at: new Date().toISOString(),
          ghl_login_email: "ovi.chand@gmail.com", // These are the credentials for browser automation
          ghl_login_password: "Dummy@123"
        };

        setGhlConfig(realGHLConfig);
        setSetupStatus('completed');
        
        addMessage('bot', '✅ GoHighLevel account created successfully!', true, 'creation_complete');
        addMessage('bot', `🎉 **Real Account Details:**\n📍 **Location ID:** ${realGHLConfig.location_id}\n🏢 **Location Name:** ${realGHLConfig.location_name}\n👤 **User:** ${realGHLConfig.user_name}\n📧 **Email:** ${realGHLConfig.user_email}\n\nYour GoHighLevel integration is now ready for Facebook and other services!`);
      } else {
        throw new Error('Backend returned failure status');
      }

    } catch (error: any) {
      console.error('Real GHL creation failed:', error);
      throw error;
    }
  };

  const useExistingCredentials = () => {
    // Use the existing hardcoded values we created
    const existingConfig: GHLSetupConfig = {
      location_id: "GJSb0aPcrBRne73LK3A3",
      user_id: "utSop6RQjsF2Mwjnr8Gg", 
      location_name: "SolarSetup_Clone_192939",
      user_name: "Ovi Colton",
      user_email: "ovi+192940@test-solar.com",
      setup_status: 'completed',
      created_at: new Date().toISOString(),
      ghl_login_email: "ovi.chand@gmail.com",
      ghl_login_password: "Dummy@123"
    };

    setGhlConfig(existingConfig);
    setSetupStatus('using_existing');
    
    addMessage('user', 'Use Existing Credentials');
    addMessage('bot', '✅ Using existing GoHighLevel credentials!', true, 'using_existing');
    addMessage('bot', `📍 **Location:** ${existingConfig.location_name}\n👤 **User:** ${existingConfig.user_name} (${existingConfig.user_email})\n\nPerfect! We'll use your existing GHL setup to avoid creating duplicate accounts.`);
  };

  const completeSetup = async () => {
    if (!ghlConfig) {
      addMessage('bot', 'Error: No GHL configuration available.');
      return;
    }

    setSaving(true);
    
    try {
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        throw new Error('Failed to get user ID');
      }

      // Critical NULL checks for composite primary key fields
      const firm_user_id = userIdResult.user_id;
      const agent_id = 'SOLAgent';
      const setup_type = 'GHLSetup';
      
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

      console.log('✅ GHL Setup - Primary key validation passed:', { firm_user_id, agent_id, setup_type });

      // Save to the squidgy_agent_business_setup table
      const { error } = await supabase
        .from('squidgy_agent_business_setup')
        .upsert({
          firm_user_id,
          agent_id,
          agent_name: 'Solar Sales Specialist',
          setup_type,
          setup_json: ghlConfig,
          is_enabled: true,
          session_id: sessionId && sessionId.includes('_') ? null : sessionId,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('🚨 Database error in GHL Setup:', error);
        console.error('🔍 Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      addMessage('bot', '💾 Configuration saved successfully!');
      addMessage('bot', '🎯 Ready to proceed with Facebook integration...');

      onConfigurationComplete(ghlConfig);

    } catch (error: any) {
      console.error('Error saving GHL setup:', error);
      addMessage('bot', `❌ Error saving setup: ${error?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">GoHighLevel Setup</h3>
            <p className="text-sm text-gray-500">Create your business sub-account and user credentials</p>
          </div>
        </div>
        <button
          onClick={onSkip}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          Skip for now
        </button>
      </div>

      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ maxHeight: '400px' }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              } ${message.isAction ? 'border-l-4 border-orange-400' : ''}`}
            >
              <p className="text-sm whitespace-pre-line">{message.message}</p>
              <p className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        {setupStatus === 'idle' && (
          <div className="space-y-2">
            <button
              onClick={useExistingCredentials}
              className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Use Existing Credentials</span>
            </button>
            <p className="text-center text-xs text-gray-500">or</p>
            <button
              onClick={startGHLCreation}
              disabled={isCreating}
              className="w-full flex items-center justify-center space-x-2 bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              <Building2 className="w-4 h-4" />
              <span>{isCreating ? 'Creating Account...' : 'Create New GHL Account'}</span>
            </button>
          </div>
        )}

        {setupStatus === 'creating' && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-lg">
              <Loader className="w-5 h-5 animate-spin" />
              <span className="font-medium">Creating GoHighLevel Account...</span>
            </div>
          </div>
        )}

        {(setupStatus === 'completed' || setupStatus === 'using_existing') && ghlConfig && (
          <div className="space-y-3">
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">GHL Account Ready!</span>
              </div>
            </div>
            
            <button
              onClick={completeSetup}
              disabled={isSaving}
              className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <Users className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Continue to Facebook Integration'}</span>
            </button>
          </div>
        )}

        {/* Skip Button */}
        <button
          onClick={onSkip}
          className="w-full text-gray-500 hover:text-gray-700 transition-colors py-2"
        >
          Skip GHL Setup for now
        </button>
      </div>
    </div>
  );
};

export default EnhancedChatGHLSetup;