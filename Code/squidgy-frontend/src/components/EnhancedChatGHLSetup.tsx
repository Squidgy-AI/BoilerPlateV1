// src/components/EnhancedChatGHLSetup.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Building2, Users, CheckCircle, Loader, AlertCircle, X, Globe, Mail, Phone, MapPin } from 'lucide-react';
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
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  message: string;
  timestamp: Date;
  isAction?: boolean;
  actionType?: 'creation_started' | 'creation_complete' | 'using_existing';
}

interface GHLFormData {
  businessName: string;
  businessEmail: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

interface FormErrors {
  [key: string]: string;
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
  
  // Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [formData, setFormData] = useState<GHLFormData>({
    businessName: '',
    businessEmail: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: 'US',
    postalCode: ''
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  
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
    // Show the form modal instead of direct creation
    setShowFormModal(true);
    addMessage('user', 'Create GoHighLevel Account');
    addMessage('bot', '📋 Please fill out your business information to create your GoHighLevel subaccount.');
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (!formData.businessName.trim()) {
      errors.businessName = 'Business name is required';
    }
    
    if (!formData.businessEmail.trim()) {
      errors.businessEmail = 'Business email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.businessEmail)) {
      errors.businessEmail = 'Please enter a valid email address';
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    }
    
    if (!formData.address.trim()) {
      errors.address = 'Address is required';
    }
    
    if (!formData.city.trim()) {
      errors.city = 'City is required';
    }
    
    if (!formData.state.trim()) {
      errors.state = 'State is required';
    }
    
    if (!formData.country.trim()) {
      errors.country = 'Country is required';
    }
    
    if (!formData.postalCode.trim()) {
      errors.postalCode = 'Postal code is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      addMessage('bot', '❌ Please fix the form errors before submitting.');
      return;
    }
    
    setIsSubmittingForm(true);
    setIsCreating(true);
    setSetupStatus('creating');
    
    try {
      await createGHLWithFormData();
      // Form modal will be closed in createGHLWithFormData on success
    } catch (error: any) {
      console.error('GHL creation error:', error);
      // Error message already added in createGHLWithFormData
      setSetupStatus('idle');
    } finally {
      setIsSubmittingForm(false);
      setIsCreating(false);
    }
  };

  const handleFormChange = (field: keyof GHLFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const createGHLWithFormData = async () => {
    // Show progress messages
    addMessage('bot', '📋 Creating GoHighLevel subaccount with your business information...');
    addMessage('bot', '⏳ This process typically takes 30-60 seconds. Please wait...');
    
    try {
      // Get backend URL - use exact same endpoint as test HTML
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://squidgy-back-919bc0659e35.herokuapp.com'
        : 'http://127.0.0.1:8010'; // Standard FastAPI development port

      // Prepare request payload exactly like test HTML
      const requestPayload = {
        // Only send business information fields
        // API credentials will be handled securely by the backend
        subaccount_name: formData.businessName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        postal_code: formData.postalCode,
        website: formData.website,
        // Include business_email at the top level for GHL location email field
        business_email: formData.businessEmail,
        // Also use businessEmail as prospect email
        prospect_email: formData.businessEmail
      };

      // Call backend API to create sub-account - exact same as test HTML
      const response = await fetch(`${backendUrl}/api/ghl/create-subaccount`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      const result = await response.json();
      
      if (response.ok) {
        // Success - clean user-friendly message
        const successMessage = `✅ **GoHighLevel Account Created Successfully!**\n\n🏢 **Business:** ${result.subaccount_name}\n📍 **Location ID:** ${result.location_id}\n🌍 **Region:** ${result.details?.country || 'N/A'}\n\n${result.message}`;
        addMessage('bot', successMessage);
        
        // Create GHL config for the app
        const realGHLConfig: GHLSetupConfig = {
          location_id: result.location_id,
          user_id: result.details?.user_id || `user_${Date.now()}`,
          location_name: result.subaccount_name,
          user_name: "Solar Sales Manager",
          user_email: formData.businessEmail,
          setup_status: 'completed',
          created_at: new Date().toISOString()
        };

        setGhlConfig(realGHLConfig);
        setSetupStatus('completed');
        
        // Close the form modal
        setShowFormModal(false);
        
        addMessage('bot', '🎉 **Setup Complete!** Your GoHighLevel integration is now ready. You can proceed to the next step.');
        
      } else {
        // Error from backend - match test HTML error format
        const errorMessage = `❌ **ERROR!**\n\n**Status:** ${response.status}\n**Message:** ${result.detail || result.message || 'Unknown error'}\n\n**Request Data:**\n\`\`\`json\n${JSON.stringify(requestPayload, null, 2)}\n\`\`\``;
        addMessage('bot', errorMessage);
        throw new Error(result.detail || result.message || 'Backend returned error');
      }

    } catch (error: any) {
      console.error('GHL creation with form data failed:', error);
      
      // Network or other error - match test HTML error format
      const errorMessage = `❌ **NETWORK ERROR!**\n\n**Error:** ${error.message}\n\n**This could be due to:**\n- Backend server not running\n- CORS issues\n- Network connectivity\n\n**Request Data:**\n\`\`\`json\n${JSON.stringify({
        subaccount_name: formData.businessName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        postal_code: formData.postalCode,
        website: formData.website,
        business_email: formData.businessEmail,
        prospect_email: formData.businessEmail
      }, null, 2)}\n\`\`\``;
      addMessage('bot', errorMessage);
      
      throw error;
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
          created_at: new Date().toISOString()
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
      created_at: new Date().toISOString()
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

      {/* GHL Subaccount Creation Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create GoHighLevel Subaccount</h2>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Business Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => handleFormChange('businessName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white placeholder-gray-500 ${
                      formErrors.businessName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your business name"
                  />
                  {formErrors.businessName && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.businessName}</p>
                  )}
                </div>

                {/* Business Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Email *
                  </label>
                  <input
                    type="email"
                    value={formData.businessEmail}
                    onChange={(e) => handleFormChange('businessEmail', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white placeholder-gray-500 ${
                      formErrors.businessEmail ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your business email"
                  />
                  {formErrors.businessEmail && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.businessEmail}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white placeholder-gray-500 ${
                      formErrors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your phone number"
                  />
                  {formErrors.phone && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>
                  )}
                </div>

                {/* Website */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleFormChange('website', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white placeholder-gray-500"
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleFormChange('address', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white placeholder-gray-500 ${
                      formErrors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your business address"
                  />
                  {formErrors.address && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.address}</p>
                  )}
                </div>

                {/* City, State, Country Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleFormChange('city', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white placeholder-gray-500 ${
                        formErrors.city ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="City"
                    />
                    {formErrors.city && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.city}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleFormChange('state', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white placeholder-gray-500 ${
                        formErrors.state ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="State"
                    />
                    {formErrors.state && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.state}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country *
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) => handleFormChange('country', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white ${
                        formErrors.country ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="AU">Australia</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="IT">Italy</option>
                      <option value="ES">Spain</option>
                      <option value="NL">Netherlands</option>
                      <option value="SE">Sweden</option>
                      <option value="NO">Norway</option>
                      <option value="DK">Denmark</option>
                      <option value="FI">Finland</option>
                    </select>
                    {formErrors.country && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.country}</p>
                    )}
                  </div>
                </div>

                {/* Postal Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => handleFormChange('postalCode', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white placeholder-gray-500 ${
                      formErrors.postalCode ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter postal code"
                  />
                  {formErrors.postalCode && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.postalCode}</p>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingForm}
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {isSubmittingForm ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <span>Create GoHighLevel Account</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedChatGHLSetup;