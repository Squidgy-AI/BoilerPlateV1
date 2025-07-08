// src/components/EnhancedChatFacebookSetup.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Facebook, ExternalLink, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/utils/getUserId';

interface EnhancedChatFacebookSetupProps {
  onConfigurationComplete: (config: FacebookIntegrationConfig) => void;
  onSkip: () => void;
  sessionId?: string;
  locationId?: string;
  userId?: string;
}

interface FacebookIntegrationConfig {
  location_id: string;
  user_id: string;
  oauth_url?: string;
  integration_status: 'pending' | 'connected' | 'failed';
  connected_at?: string;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  message: string;
  timestamp: Date;
  isAction?: boolean;
  actionType?: 'url_generated' | 'url_opened' | 'integration_complete';
}

const EnhancedChatFacebookSetup: React.FC<EnhancedChatFacebookSetupProps> = ({
  onConfigurationComplete,
  onSkip,
  sessionId,
  locationId = "GJSb0aPcrBRne73LK3A3", // Default from SolarSetup_Clone_192939
  userId = "utSop6RQjsF2Mwjnr8Gg" // Default from Ovi Colton
}) => {
  const [isSaving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      message: 'Hi! I\'m here to help you connect your Facebook account for social media posting. This will enable you to manage your Facebook pages directly from Squidgy.',
      timestamp: new Date()
    },
    {
      id: '2', 
      sender: 'bot',
      message: 'Once connected, you\'ll be able to schedule posts, engage with customers, and manage your solar business\'s social media presence seamlessly.',
      timestamp: new Date()
    }
  ]);
  const [generatedOAuthUrl, setGeneratedOAuthUrl] = useState<string | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<'idle' | 'generating' | 'ready' | 'connected'>('idle');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const generateFacebookOAuthUrl = async () => {
    setIsGenerating(true);
    setIntegrationStatus('generating');
    
    addMessage('user', 'Generate Facebook OAuth URL');
    addMessage('bot', 'Generating your Facebook OAuth URL... Please wait a moment.');

    try {
      // Use the backend API endpoint we just created
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://squidgy-back-919bc0659e35.herokuapp.com'
        : 'http://localhost:8000'; // For local development
      
      const response = await fetch(`${backendUrl}/api/facebook/extract-oauth-params`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId: locationId,
          userId: userId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate OAuth URL: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success && result.params) {
        // Build the OAuth URL with enhanced scopes and proper state
        const oauthParams = new URLSearchParams({
          response_type: result.params.response_type || 'code',
          client_id: result.params.client_id,
          redirect_uri: 'https://services.leadconnectorhq.com/integrations/oauth/finish',
          scope: buildEnhancedScope(result.params.scope),
          state: JSON.stringify({
            locationId: locationId,
            userId: userId,
            type: 'facebook',
            source: 'squidgy_chat'
          }),
          logger_id: result.params.logger_id || generateLoggerId()
        });

        const finalOAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?${oauthParams.toString()}`;
        
        setGeneratedOAuthUrl(finalOAuthUrl);
        setIntegrationStatus('ready');
        
        addMessage('bot', '✅ Facebook OAuth URL generated successfully!', true, 'url_generated');
        addMessage('bot', 'You can now click the button below to open Facebook and connect your account. After completing the authentication, you\'ll be redirected back to Squidgy.');
        
      } else {
        throw new Error('Failed to extract OAuth parameters from response');
      }

    } catch (error) {
      console.error('Facebook OAuth generation error:', error);
      addMessage('bot', `❌ Error generating OAuth URL: ${error.message}`);
      setIntegrationStatus('idle');
    } finally {
      setIsGenerating(false);
    }
  };

  const buildEnhancedScope = (ghlScope?: string) => {
    const ghlScopes = ghlScope ? ghlScope.split(',').map(s => s.trim()) : [];
    
    const requiredScopes = [
      'pages_manage_ads',
      'pages_read_engagement', 
      'pages_show_list',
      'pages_read_user_content',
      'pages_manage_metadata',
      'pages_manage_posts',
      'pages_manage_engagement',
      'leads_retrieval',
      'ads_read',
      'pages_messaging',
      'ads_management',
      'instagram_basic',
      'instagram_manage_messages',
      'instagram_manage_comments',
      'business_management',
      'catalog_management',
      'email',
      'public_profile',
      'read_insights'
    ];
    
    const allScopes = [...ghlScopes];
    requiredScopes.forEach(scope => {
      if (!allScopes.includes(scope)) {
        allScopes.push(scope);
      }
    });
    
    return allScopes.join(',');
  };

  const generateLoggerId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const openFacebookOAuth = () => {
    if (!generatedOAuthUrl) {
      addMessage('bot', 'Error: No OAuth URL available. Please generate the URL first.');
      return;
    }

    addMessage('user', 'Open Facebook OAuth');
    addMessage('bot', 'Opening Facebook OAuth in new tab. Complete the authentication process and you\'ll be redirected back here.', true, 'url_opened');

    const newTab = window.open(generatedOAuthUrl, '_blank');
    
    if (!newTab) {
      addMessage('bot', 'Popup blocker may be preventing the OAuth window from opening. Please allow popups and try again.');
    }
  };

  const copyUrlToClipboard = async () => {
    if (!generatedOAuthUrl) {
      addMessage('bot', 'Error: No OAuth URL to copy.');
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedOAuthUrl);
      addMessage('bot', '📋 OAuth URL copied to clipboard! You can paste it anywhere you need.');
    } catch (err) {
      addMessage('bot', 'Failed to copy URL to clipboard. Please copy it manually from the text box above.');
    }
  };

  const completeIntegration = async () => {
    setSaving(true);
    
    try {
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        throw new Error('Failed to get user ID');
      }

      const facebookConfig: FacebookIntegrationConfig = {
        location_id: locationId,
        user_id: userId,
        oauth_url: generatedOAuthUrl || '',
        integration_status: 'connected',
        connected_at: new Date().toISOString()
      };

      // Save to the squidgy_agent_business_setup table
      const { error } = await supabase
        .from('squidgy_agent_business_setup')
        .upsert({
          firm_user_id: userIdResult.user_id,
          agent_id: 'SOLAgent',
          setup_type: 'FacebookIntegration',
          setup_json: facebookConfig,
          is_enabled: true,
          session_id: sessionId && sessionId.includes('_') ? null : sessionId,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      setIntegrationStatus('connected');
      addMessage('bot', '🎉 Facebook integration completed successfully!', true, 'integration_complete');
      addMessage('bot', 'Your Facebook account is now connected and ready for social media posting through Squidgy.');

      onConfigurationComplete(facebookConfig);

    } catch (error) {
      console.error('Error saving Facebook integration:', error);
      addMessage('bot', `❌ Error completing integration: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <Facebook className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Facebook Integration</h3>
            <p className="text-sm text-gray-500">Connect your Facebook account for social media posting</p>
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
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              } ${message.isAction ? 'border-l-4 border-blue-400' : ''}`}
            >
              <p className="text-sm">{message.message}</p>
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
        {integrationStatus === 'idle' && (
          <button
            onClick={generateFacebookOAuthUrl}
            disabled={isGenerating}
            className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <Facebook className="w-4 h-4" />
            <span>{isGenerating ? 'Generating...' : 'Start Facebook Integration'}</span>
          </button>
        )}

        {integrationStatus === 'ready' && generatedOAuthUrl && (
          <div className="space-y-3">
            {/* OAuth URL Display */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Generated Facebook OAuth URL:</p>
              <div className="bg-white border border-gray-200 rounded p-2 text-xs font-mono break-all">
                {generatedOAuthUrl.substring(0, 100)}...
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={openFacebookOAuth}
                className="flex-1 flex items-center justify-center space-x-2 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Facebook OAuth</span>
              </button>
              <button
                onClick={copyUrlToClipboard}
                className="flex items-center justify-center space-x-2 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            {/* Complete Integration Button */}
            <button
              onClick={completeIntegration}
              disabled={isSaving}
              className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSaving ? 'Completing...' : 'Mark Integration Complete'}</span>
            </button>
          </div>
        )}

        {integrationStatus === 'connected' && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Facebook Integration Complete!</span>
            </div>
          </div>
        )}

        {/* Skip Button */}
        <button
          onClick={onSkip}
          className="w-full text-gray-500 hover:text-gray-700 transition-colors py-2"
        >
          Skip Facebook Integration for now
        </button>
      </div>
    </div>
  );
};

export default EnhancedChatFacebookSetup;