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
  ghlCredentials?: {
    email: string;
    password: string;
  };
}

interface FacebookIntegrationConfig {
  location_id: string;
  user_id: string;
  oauth_url?: string;
  integration_status: 'pending' | 'connected' | 'failed';
  connected_at?: string;
  facebook_pages?: any[];
  selected_page_ids?: string[];
}

interface FacebookPage {
  facebookPageId: string;
  facebookPageName: string;
  facebookIgnoreMessages: boolean;
  isInstagramAvailable: boolean;
  pageAccessToken?: string;
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
  userId = "utSop6RQjsF2Mwjnr8Gg", // Default from Ovi Colton
  ghlCredentials
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
  const [integrationStatus, setIntegrationStatus] = useState<'idle' | 'generating' | 'ready' | 'automating' | 'selecting_pages' | 'connected'>('idle');
  const [automationProgress, setAutomationProgress] = useState<string>('');
  const [availablePages, setAvailablePages] = useState<FacebookPage[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [isAutomating, setIsAutomating] = useState(false);
  
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

  const startBrowserAutomation = async () => {
    if (!ghlCredentials || !ghlCredentials.email || !ghlCredentials.password) {
      addMessage('bot', '❌ GHL credentials not found. Please complete the GHL setup first.');
      return;
    }

    setIsAutomating(true);
    setIntegrationStatus('automating');
    
    addMessage('user', 'Start Facebook Integration');
    addMessage('bot', '🚀 Starting browser automation to connect your Facebook account...');
    addMessage('bot', '🔐 I\'ll log in to GoHighLevel for you and handle the Facebook connection process.');
    setAutomationProgress('Starting browser...');

    try {
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://squidgy-back-919bc0659e35.herokuapp.com'
        : 'http://localhost:8000';
      
      const response = await fetch(`${backendUrl}/api/facebook/integrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location_id: locationId,
          user_id: userId,
          email: ghlCredentials.email,
          password: ghlCredentials.password,
          firm_user_id: await getUserId().then(r => r.user_id),
          enable_2fa_bypass: false
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to start automation: ${response.status}`);
      }

      const result = await response.json();
      
      addMessage('bot', '✅ Browser automation started! A new browser window will open.');
      addMessage('bot', '📱 If 2FA is required, please check your email for the verification code.');
      
      // Start polling for status
      pollAutomationStatus();
      
    } catch (error) {
      console.error('Browser automation error:', error);
      addMessage('bot', `❌ Error starting automation: ${error.message}`);
      setIntegrationStatus('idle');
      setIsAutomating(false);
    }
  };

  const pollAutomationStatus = async () => {
    const backendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://squidgy-back-919bc0659e35.herokuapp.com'
      : 'http://localhost:8000';
    
    const checkStatus = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/facebook/integration-status/${locationId}`);
        
        if (response.ok) {
          const status = await response.json();
          
          if (status.status === 'success' && status.pages) {
            setAvailablePages(status.pages);
            setIntegrationStatus('selecting_pages');
            setIsAutomating(false);
            setAutomationProgress('');
            
            addMessage('bot', `✅ Found ${status.pages.length} Facebook pages!`, true, 'pages_found');
            addMessage('bot', 'Please select which pages you want to connect to Squidgy for social media management.');
            
            // Stop polling
            return true;
          } else if (status.status === 'failed') {
            addMessage('bot', '❌ Automation failed. Please try again or contact support.');
            setIntegrationStatus('idle');
            setIsAutomating(false);
            return true;
          }
          
          // Update progress message
          if (status.current_step) {
            setAutomationProgress(status.current_step);
          }
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }
      
      return false;
    };
    
    // Poll every 2 seconds for up to 2 minutes
    let attempts = 0;
    const maxAttempts = 60;
    
    const interval = setInterval(async () => {
      attempts++;
      
      const done = await checkStatus();
      
      if (done || attempts >= maxAttempts) {
        clearInterval(interval);
        
        if (attempts >= maxAttempts) {
          addMessage('bot', '⏱️ Automation is taking longer than expected. Please check the browser window.');
          setIntegrationStatus('idle');
          setIsAutomating(false);
        }
      }
    }, 2000);
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

      // Critical NULL checks for composite primary key fields
      const firm_user_id = userIdResult.user_id;
      const agent_id = 'SOLAgent';
      const setup_type = 'FacebookIntegration';
      
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

      console.log('✅ Facebook Setup - Primary key validation passed:', { firm_user_id, agent_id, setup_type });

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
          firm_user_id,
          agent_id,
          agent_name: 'Solar Sales Specialist',
          setup_type,
          setup_json: facebookConfig,
          is_enabled: true,
          session_id: sessionId && sessionId.includes('_') ? null : sessionId,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('🚨 Database error in Facebook Setup:', error);
        console.error('🔍 Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

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
            onClick={startBrowserAutomation}
            disabled={isAutomating}
            className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <Facebook className="w-4 h-4" />
            <span>{isAutomating ? 'Starting Automation...' : 'Connect Facebook Account'}</span>
          </button>
        )}

        {integrationStatus === 'automating' && (
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin w-5 h-5 border-3 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-gray-700 font-medium">Processing Facebook Integration...</span>
            </div>
            {automationProgress && (
              <p className="text-sm text-gray-600">{automationProgress}</p>
            )}
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>What's happening:</strong><br/>
                {process.env.NODE_ENV === 'development' ? (
                  <>
                    • Opening browser in incognito mode<br/>
                    • Logging into GoHighLevel<br/>
                    • Navigating to Facebook integration<br/>
                    • Extracting your Facebook pages
                  </>
                ) : (
                  <>
                    • Connecting to GoHighLevel API<br/>
                    • Authenticating with Facebook<br/>
                    • Retrieving your Facebook pages<br/>
                    • Processing integration data
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {integrationStatus === 'selecting_pages' && availablePages.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Select Facebook Pages to Connect:</h4>
            <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
              {availablePages.map((page) => (
                <label key={page.facebookPageId} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPages.includes(page.facebookPageId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPages([...selectedPages, page.facebookPageId]);
                      } else {
                        setSelectedPages(selectedPages.filter(id => id !== page.facebookPageId));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{page.facebookPageName}</p>
                    {page.isInstagramAvailable && (
                      <p className="text-xs text-gray-500">Instagram available</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
            <button
              onClick={async () => {
                if (selectedPages.length === 0) {
                  addMessage('bot', '⚠️ Please select at least one page to connect.');
                  return;
                }
                
                setSaving(true);
                addMessage('bot', `Connecting ${selectedPages.length} selected pages...`);
                
                // Save the configuration
                const config: FacebookIntegrationConfig = {
                  location_id: locationId,
                  user_id: userId,
                  integration_status: 'connected',
                  connected_at: new Date().toISOString(),
                  facebook_pages: availablePages,
                  selected_page_ids: selectedPages
                };
                
                await completeIntegration();
              }}
              disabled={selectedPages.length === 0 || isSaving}
              className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>
                {isSaving ? 'Connecting...' : `Connect ${selectedPages.length} Selected Page${selectedPages.length !== 1 ? 's' : ''}`}
              </span>
            </button>
          </div>
        )}

        {integrationStatus === 'ready' && generatedOAuthUrl && (
          <div className="space-y-3">
            {/* Direct Connect Button */}
            <button
              onClick={openFacebookOAuth}
              className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Connect Facebook Account</span>
            </button>

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