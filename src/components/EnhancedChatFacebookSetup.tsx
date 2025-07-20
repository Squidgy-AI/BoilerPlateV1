// src/components/EnhancedChatFacebookSetup.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Facebook, ExternalLink, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/utils/getUserId';
import { getGHLCredentials } from '@/utils/getGHLCredentials';

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
  locationId, // Dynamic location_id from GHL setup
  userId, // Dynamic user_id from GHL setup
  ghlCredentials
}) => {
  const [isSaving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [generatedOAuthUrl, setGeneratedOAuthUrl] = useState<string | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<'idle' | 'step1_oauth' | 'step2_getting_pages' | 'step3_selecting_pages' | 'completed'>('idle');
  const [facebookPages, setFacebookPages] = useState<any[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [oauthCompleted, setOauthCompleted] = useState(false);
  const [storedJwtToken, setStoredJwtToken] = useState<string | null>(null);
  const [actualLocationId, setActualLocationId] = useState<string>(locationId || ''); // Track actual location_id from backend
  const [existingFacebookConfig, setExistingFacebookConfig] = useState<FacebookIntegrationConfig | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load existing Facebook setup on component mount
  useEffect(() => {
    const loadExistingFacebookSetup = async () => {
      try {
        const userIdResult = await getUserId();
        if (!userIdResult.success || !userIdResult.user_id) {
          console.log('No user ID available for Facebook setup');
          setIsLoading(false);
          return;
        }

        // Query database for existing Facebook setup
        const { data, error } = await supabase
          .from('squidgy_agent_business_setup')
          .select('setup_json')
          .eq('firm_user_id', userIdResult.user_id)
          .eq('agent_id', 'SOLAgent')
          .eq('setup_type', 'FacebookSetup')
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            console.log('No existing Facebook setup found');
          } else {
            console.error('Error loading Facebook setup:', error);
          }
          setIsLoading(false);
          return;
        }

        if (data?.setup_json) {
          console.log('✅ Loading existing Facebook setup:', data.setup_json);
          const config = data.setup_json as FacebookIntegrationConfig;
          setExistingFacebookConfig(config);
          setIntegrationStatus('completed');
          setOauthCompleted(true);
          if (config.facebook_pages) {
            setFacebookPages(config.facebook_pages);
          }
          if (config.selected_page_ids) {
            setSelectedPageIds(config.selected_page_ids);
          }
        }
      } catch (error) {
        console.error('Failed to load Facebook setup:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingFacebookSetup();
  }, []);

  useEffect(() => {
    // Initialize messages with dynamic values
    if (locationId && userId && messages.length === 0 && !isLoading) {
      const initialMessages = [
        {
          id: '1',
          sender: 'bot' as const,
          message: '👋 Hi! I\'ll help you connect Facebook using your GoHighLevel credentials.',
          timestamp: new Date()
        }
      ];

      if (existingFacebookConfig) {
        initialMessages.push({
          id: '2',
          sender: 'bot' as const,
          message: `✅ **Found existing Facebook integration!**\n• Status: ${existingFacebookConfig.integration_status}\n• Connected Pages: ${existingFacebookConfig.facebook_pages?.length || 0}\n• Selected Pages: ${existingFacebookConfig.selected_page_ids?.length || 0}`,
          timestamp: new Date()
        });
      } else {
        initialMessages.push({
          id: '2',
          sender: 'bot' as const,
          message: `📍 **Using your GHL Account:**\n• Location ID: ${locationId}\n• User ID: ${userId}\n• Automation Email: ${ghlCredentials?.email || 'Not provided'}\n\n**Facebook Integration Steps:**\n**Step 1:** Connect your Facebook account via OAuth\n**Step 2:** Get your Facebook pages using automation\n**Step 3:** Select which pages to connect to Squidgy`,
          timestamp: new Date()
        });
      }

      setMessages(initialMessages);
    }
  }, [locationId, userId, ghlCredentials, isLoading, existingFacebookConfig]);

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

  // STEP 1: Generate and complete OAuth
  const startStep1OAuth = async () => {
    setIsGenerating(true);
    setIntegrationStatus('step1_oauth');
    
    addMessage('user', 'Start Facebook OAuth Connection');
    addMessage('bot', '🔗 **Step 1: Connect Your Facebook Account**');
    addMessage('bot', 'Generating Facebook OAuth URL to connect your business account...');

    try {
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://squidgy-back-919bc0659e35.herokuapp.com'
        : 'http://localhost:8000';
      
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
        const oauthParams = new URLSearchParams({
          response_type: result.params.response_type || 'code',
          client_id: result.params.client_id,
          redirect_uri: 'https://services.leadconnectorhq.com/integrations/oauth/finish',
          scope: buildEnhancedScope(result.params.scope),
          state: JSON.stringify({
            locationId: locationId,
            userId: userId,
            type: 'facebook',
            source: 'squidgy_step1'
          }),
          logger_id: result.params.logger_id || generateLoggerId()
        });

        const finalOAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?${oauthParams.toString()}`;
        
        setGeneratedOAuthUrl(finalOAuthUrl);
        
        addMessage('bot', '✅ OAuth URL generated successfully!');
        addMessage('bot', '👆 **Click the button below to connect your Facebook account.**\n\nYou\'ll be taken to Facebook to authorize the connection, then return here for the next step.');
        
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

  const completeStep1OAuth = () => {
    addMessage('user', 'Facebook OAuth Completed');
    addMessage('bot', '🎉 **Step 1 Complete!** Your Facebook account is now connected.');
    addMessage('bot', '📋 **Ready for Step 2:** Click below to retrieve your Facebook pages using browser automation.');
    setOauthCompleted(true);
  };

  // STEP 2: Browser automation to get Facebook pages
  const startStep2GetPages = async () => {
    setIntegrationStatus('step2_getting_pages');
    
    addMessage('user', 'Get Facebook Pages');
    addMessage('bot', '🤖 **Step 2: Getting Your Facebook Pages**');
    addMessage('bot', 'Starting browser automation to retrieve your Facebook pages and tokens...');

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
          email: ghlCredentials?.email || 'somashekhar34+demo@gmail.com',
          password: ghlCredentials?.password || 'Dummy@123',
          firm_user_id: await getUserId().then(r => r.user_id),
          step: 'get_pages_only'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to start page retrieval: ${response.status}`);
      }

      const result = await response.json();
      
      // Use the location_id returned from backend (may be different from what we sent)
      if (result.location_id) {
        setActualLocationId(result.location_id);
        console.log(`Using backend location_id: ${result.location_id} (sent: ${locationId})`);
      }
      
      addMessage('bot', '⏳ Browser automation started! This will:');
      addMessage('bot', '• Login to GoHighLevel with your credentials\n• Extract JWT token\n• Get all your Facebook pages\n• Store tokens safely');
      
      // Start polling for results using the actual location_id
      pollForPages(result.location_id || actualLocationId);
      
    } catch (error) {
      console.error('Page retrieval error:', error);
      addMessage('bot', `❌ Error starting page retrieval: ${error.message}`);
      setIntegrationStatus('step1_oauth');
    }
  };

  const pollForPages = async (statusLocationId?: string) => {
    const backendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://squidgy-back-919bc0659e35.herokuapp.com'
      : 'http://localhost:8000';
    
    // Use the provided location_id or fallback to stored actual location_id
    const checkLocationId = statusLocationId || actualLocationId;
    console.log(`Polling status with location_id: ${checkLocationId}`);
    
    let attempts = 0;
    const maxAttempts = 120; // 4 minutes polling (increased for backend processing time)
    
    const checkPages = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/facebook/integration-status/${checkLocationId}`);
        
        if (response.ok) {
          const status = await response.json();
          
          if (status.status === 'success' && status.pages) {
            setFacebookPages(status.pages);
            setStoredJwtToken(status.jwt_token);
            setIntegrationStatus('step3_selecting_pages');
            
            addMessage('bot', `✅ **Step 2 Complete!** Found ${status.pages.length} Facebook pages!`);
            addMessage('bot', '📄 **Ready for Step 3:** Select which pages you want to connect to Squidgy.');
            
            return true;
          } else if (status.status === 'failed') {
            addMessage('bot', '❌ Page retrieval failed. Please try again.');
            setIntegrationStatus('step1_oauth');
            return true;
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
      
      return false;
    };
    
    const interval = setInterval(async () => {
      attempts++;
      
      const done = await checkPages();
      
      if (done || attempts >= maxAttempts) {
        clearInterval(interval);
        
        if (attempts >= maxAttempts) {
          // Fallback: Check database directly for completed results
          addMessage('bot', '⏳ Checking for completed results...');
          try {
            const dbResponse = await fetch(`${backendUrl}/api/facebook/pages/${checkLocationId}`);
            if (dbResponse.ok) {
              const dbData = await dbResponse.json();
              if (dbData.success && dbData.pages && dbData.pages.length > 0) {
                setFacebookPages(dbData.pages);
                setStoredJwtToken(dbData.jwt_token);
                setIntegrationStatus('step3_selecting_pages');
                addMessage('bot', `✅ **Step 2 Complete!** Found ${dbData.pages.length} Facebook pages from database!`);
                addMessage('bot', '📄 **Ready for Step 3:** Select which pages you want to connect to Squidgy.');
                return;
              }
            }
          } catch (error) {
            console.error('Database fallback error:', error);
          }
          
          addMessage('bot', '⏱️ Page retrieval is taking longer than expected. The integration may have completed successfully. Please check your GoHighLevel dashboard or try again.');
          setIntegrationStatus('step1_oauth');
        }
      }
    }, 2000);
  };

  // STEP 3: Page selection and final attachment
  const completeStep3Selection = async () => {
    if (selectedPageIds.length === 0) {
      addMessage('bot', '⚠️ Please select at least one Facebook page to connect.');
      return;
    }

    setSaving(true);
    addMessage('bot', `🔗 **Step 3: Connecting ${selectedPageIds.length} selected page(s)...**`);

    try {
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://squidgy-back-919bc0659e35.herokuapp.com'
        : 'http://localhost:8000';
      
      // Connect each selected page
      for (const pageId of selectedPageIds) {
        const response = await fetch(`${backendUrl}/api/facebook/connect-page`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            location_id: locationId,
            page_id: pageId,
            jwt_token: storedJwtToken
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to connect page ${pageId}`);
        }
      }

      // Save final configuration
      await saveFinalConfiguration();
      
      setIntegrationStatus('completed');
      addMessage('bot', '🎉 **All Steps Complete!** Your Facebook pages are now connected to Squidgy!');
      addMessage('bot', '✨ You can now manage your Facebook pages, schedule posts, and engage with customers directly from Squidgy.');
      
    } catch (error) {
      console.error('Page connection error:', error);
      addMessage('bot', `❌ Error connecting pages: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const saveFinalConfiguration = async () => {
    const userIdResult = await getUserId();
    if (!userIdResult.success || !userIdResult.user_id) {
      throw new Error('Failed to get user ID');
    }

    const config: FacebookIntegrationConfig = {
      location_id: locationId,
      user_id: userId,
      oauth_url: generatedOAuthUrl || '',
      integration_status: 'connected',
      connected_at: new Date().toISOString(),
      facebook_pages: facebookPages,
      selected_page_ids: selectedPageIds
    };

    // Get GHL credentials to include in the record
    const ghlResult = await getGHLCredentials();
    let ghl_location_id = null;
    let ghl_user_id = null;
    
    if (ghlResult.success && ghlResult.credentials) {
      ghl_location_id = ghlResult.credentials.location_id;
      ghl_user_id = ghlResult.credentials.user_id;
      console.log('✅ Including GHL credentials in Facebook setup:', { ghl_location_id, ghl_user_id });
    } else {
      console.warn('⚠️ GHL credentials not available for Facebook setup:', ghlResult.error);
    }

    // Save to database with proper conflict resolution
    const { error } = await supabase
      .from('squidgy_agent_business_setup')
      .upsert({
        firm_user_id: userIdResult.user_id,
        agent_id: 'SOLAgent',
        agent_name: 'Solar Sales Specialist',
        setup_type: 'FacebookSetup',
        setup_json: config,
        is_enabled: true,
        session_id: sessionId && sessionId.includes('_') ? null : sessionId,
        updated_at: new Date().toISOString(),
        ghl_location_id,
        ghl_user_id
      }, {
        onConflict: 'firm_user_id,agent_id,setup_type',
        ignoreDuplicates: false
      });

    if (error) {
      throw error;
    }

    onConfigurationComplete(config);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Facebook className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Facebook Integration</h3>
              <p className="text-sm text-gray-500">Loading existing integration...</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-gray-600">Loading saved integration...</div>
        </div>
      </div>
    );
  }

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
            <p className="text-sm text-gray-500">3-step process to connect your Facebook pages</p>
          </div>
        </div>
        {/* Skip removed for mandatory setup */}
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
        {/* STEP 1: Initial OAuth Setup */}
        {integrationStatus === 'idle' && (
          <button
            onClick={startStep1OAuth}
            disabled={isGenerating}
            className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <Facebook className="w-4 h-4" />
            <span>{isGenerating ? 'Generating OAuth...' : 'Step 1: Connect Facebook Account'}</span>
          </button>
        )}

        {/* STEP 1: OAuth URL Ready */}
        {integrationStatus === 'step1_oauth' && generatedOAuthUrl && (
          <div className="space-y-3">
            <button
              onClick={openFacebookOAuth}
              className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Facebook OAuth</span>
            </button>
            
            <button
              onClick={completeStep1OAuth}
              className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>I Completed Facebook OAuth ✓</span>
            </button>
          </div>
        )}

        {/* STEP 2: Get Facebook Pages */}
        {oauthCompleted && integrationStatus !== 'step3_selecting_pages' && integrationStatus !== 'completed' && (
          <button
            onClick={startStep2GetPages}
            disabled={integrationStatus === 'step2_getting_pages'}
            className="w-full flex items-center justify-center space-x-2 bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {integrationStatus === 'step2_getting_pages' ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <Facebook className="w-4 h-4" />
            )}
            <span>
              {integrationStatus === 'step2_getting_pages' 
                ? 'Getting Pages...' 
                : 'Step 2: Get Facebook Pages'}
            </span>
          </button>
        )}

        {/* STEP 3: Page Selection */}
        {integrationStatus === 'step3_selecting_pages' && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 text-center">Step 3: Select Facebook Pages</h4>
            
            <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
              {facebookPages.map((page, index) => (
                <label key={page.facebookPageId || index} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPageIds.includes(page.facebookPageId || page.id)}
                    onChange={(e) => {
                      const pageId = page.facebookPageId || page.id;
                      if (e.target.checked) {
                        setSelectedPageIds([...selectedPageIds, pageId]);
                      } else {
                        setSelectedPageIds(selectedPageIds.filter(id => id !== pageId));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {page.facebookPageName || page.name || `Page ${index + 1}`}
                    </p>
                    {page.isInstagramAvailable && (
                      <p className="text-xs text-gray-500">Instagram available</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
            
            <button
              onClick={completeStep3Selection}
              disabled={selectedPageIds.length === 0 || isSaving}
              className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>
                {isSaving 
                  ? 'Connecting...' 
                  : `Connect ${selectedPageIds.length} Selected Page${selectedPageIds.length !== 1 ? 's' : ''}`}
              </span>
            </button>
          </div>
        )}

        {/* COMPLETED */}
        {integrationStatus === 'completed' && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Facebook Integration Complete!</span>
            </div>
          </div>
        )}

        {/* Skip removed for mandatory setup */}
      </div>
    </div>
  );
};

export default EnhancedChatFacebookSetup;