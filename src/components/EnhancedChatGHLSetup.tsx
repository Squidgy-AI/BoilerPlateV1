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
      message: 'Hi! Now I need to set up your business account. This will create your dedicated account and user credentials for managing your solar business.',
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
  
  // Inline form state
  const [showInlineForm, setShowInlineForm] = useState(false);
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
        
        addMessage('bot', '✅ Found existing account setup!', true, 'using_existing');
        addMessage('bot', `📍 **Location:** ${existingConfig.location_name || existingConfig.location_id}\n👤 **User:** ${existingConfig.user_name || 'Solar Specialist'} (${existingConfig.user_email || 'configured'})\n\nYour account integration is already configured and ready to use.`);
      }
    } catch (error) {
      console.error('Error checking existing GHL setup:', error);
    }
  };

  const startGHLCreation = async () => {
    setIsCreating(true);
    setSetupStatus('creating');
    
    addMessage('user', 'Create Account');
    addMessage('bot', '🚀 Starting account creation...', true, 'creation_started');
    addMessage('bot', '⏳ This process calls the API to create your actual sub-account and user credentials.');

    try {
      // Call the real backend API for GHL creation
      await simulateGHLCreation();

    } catch (error: any) {
      console.error('GHL creation error:', error);
      addMessage('bot', `❌ Error creating account: ${error?.message || 'Unknown error'}`);
      setSetupStatus('idle');
    } finally {
      setIsCreating(false);
    }
  };

  const simulateGHLCreation = async () => {
    // Show progress messages
    addMessage('bot', '📋 Creating sub-account...');
    
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
        throw new Error(`Failed to create account: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.status === 'success') {
        // Extract real location_id from backend response
        const realLocationId = result.subaccount.location_id;
        // Use business_user as primary, since it's the actual business owner
        const businessUser = result.business_user;
        const somaUser = result.soma_user;
        
        const realGHLConfig: GHLSetupConfig = {
          location_id: realLocationId,
          user_id: businessUser.user_id, // Primary business user
          location_name: `SolarBusiness_${realLocationId}`, // Use location_id in name as you requested
          user_name: businessUser.details.name || "Solar Sales Manager",
          user_email: businessUser.details.email || `sa+${randomNum}@squidgy.ai`,
          setup_status: 'completed',
          created_at: new Date().toISOString()
        };

        setGhlConfig(realGHLConfig);
        setSetupStatus('completed');
        
        addMessage('bot', '✅ Account created successfully!', true, 'creation_complete');
        addMessage('bot', `🎉 **Dual User Account Details:**\n📍 **Location ID:** ${realGHLConfig.location_id}\n🏢 **Location Name:** ${realGHLConfig.location_name}\n👤 **Business User:** ${realGHLConfig.user_name} (${realGHLConfig.user_email})\n👤 **Soma User:** ${somaUser.details.name} (${somaUser.details.email})\n\nBoth accounts are created and ready for Facebook integration!`);
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
  };

  const handleCreateNewAccount = () => {
    addMessage('bot', '📋 Please fill out the form below with your business information.');
    setShowInlineForm(true);
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (!formData.businessName.trim()) errors.businessName = 'Business name is required';
    if (!formData.businessEmail.trim()) errors.businessEmail = 'Business email is required';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.address.trim()) errors.address = 'Address is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.state.trim()) errors.state = 'State is required';
    if (!formData.country.trim()) errors.country = 'Country is required';
    if (!formData.postalCode.trim()) errors.postalCode = 'Postal code is required';
    
    if (formData.businessEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.businessEmail)) {
      errors.businessEmail = 'Please enter a valid email address';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createGHLWithFormData = async () => {
    if (!validateForm()) return;
    
    setIsSubmittingForm(true);
    addMessage('bot', '📋 Setting up your business account...');
    
    const backendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://squidgy-back-919bc0659e35.herokuapp.com'
      : 'http://127.0.0.1:8010';
    
    // Use the combined endpoint that creates BOTH sub-account AND user
    const requestPayload = {
      company_id: "lp2p1q27DrdGta1qGDJd",
      snapshot_id: "7oAH6Cmto5ZcWAaEsrrq",  // SOL - Solar Assistant snapshot
      agency_token: "pit-c4e9d6af-8956-4a84-9b83-554fb6801a69",
      subaccount_name: formData.businessName,
      prospect_email: formData.businessEmail,
      prospect_first_name: formData.businessName.split(' ')[0] || 'Business',
      prospect_last_name: formData.businessName.split(' ').slice(1).join(' ') || 'Owner',
      phone: formData.phone,
      website: formData.website || '',
      address: formData.address,
      city: formData.city,
      state: formData.state,
      country: formData.country,
      postal_code: formData.postalCode,
      timezone: 'America/Los_Angeles',
      allow_duplicate_contact: false,
      allow_duplicate_opportunity: false,
      allow_facebook_name_merge: true,
      disable_contact_timezone: false
    };
    
    try {
      addMessage('bot', '🏢 Creating sub-account...');
      
      // Use the combined endpoint that creates both sub-account and user
      const response = await fetch(`${backendUrl}/api/ghl/create-subaccount-and-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });
      
      const result = await response.json();
      
      if (response.ok && result.status === 'success') {
        addMessage('bot', '✅ Both sub-account and dual users created successfully!');
        
        // Handle the new dual user response structure
        const businessUser = result.business_user;
        const somaUser = result.soma_user;
        
        console.log('GHL Account Created Successfully:', {
          business: result.subaccount.subaccount_name,
          locationId: result.subaccount.location_id,
          businessUserId: businessUser.user_id,
          businessUserName: businessUser.details.name,
          businessUserEmail: businessUser.details.email,
          somaUserId: somaUser.user_id,
          somaUserName: somaUser.details.name,
          somaUserEmail: somaUser.details.email,
          fullResponse: result
        });
        
        setShowInlineForm(false);
        setSetupStatus('completed');
        
        const newConfig: GHLSetupConfig = {
          location_id: result.subaccount.location_id,
          user_id: businessUser.user_id, // Use business user as primary
          location_name: result.subaccount.subaccount_name || formData.businessName,
          user_name: businessUser.details.name || formData.businessName,
          user_email: businessUser.details.email || formData.businessEmail,
          setup_status: 'completed',
          created_at: new Date().toISOString()
        };
        setGhlConfig(newConfig);
        
        addMessage('bot', `🎉 **Dual User Account Details:**\n📍 **Location ID:** ${newConfig.location_id}\n🏢 **Business:** ${newConfig.location_name}\n👤 **Business User:** ${newConfig.user_name} (${newConfig.user_email})\n👤 **Soma User:** ${somaUser.details.name} (${somaUser.details.email})\n\nBoth users are created and ready for Facebook integration!`);
      } else {
        console.error('GHL Account Creation Failed:', {
          status: response.status,
          error: result.detail || result.message || 'Unknown error',
          fullResponse: result
        });
        
        throw new Error(result.detail || result.message || 'Unknown error');
      }
    } catch (error: any) {
      console.error('GHL Account Creation Error:', error);
      addMessage('bot', `❌ Error creating account: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleInputChange = (field: keyof GHLFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
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
            <h3 className="text-lg font-semibold text-gray-900">Business Information Setup</h3>
            <p className="text-sm text-gray-500">Enter your business details to get started</p>
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

      {/* Inline GHL Form */}
      {showInlineForm && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <form onSubmit={(e) => { e.preventDefault(); createGHLWithFormData(); }} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 ${formErrors.businessName ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter your business name"
                />
                {formErrors.businessName && <p className="text-red-500 text-xs mt-1">{formErrors.businessName}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Email *</label>
                <input
                  type="email"
                  value={formData.businessEmail}
                  onChange={(e) => handleInputChange('businessEmail', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 ${formErrors.businessEmail ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter your business email"
                />
                {formErrors.businessEmail && <p className="text-red-500 text-xs mt-1">{formErrors.businessEmail}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 ${formErrors.phone ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter your phone number"
                />
                {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website (Optional)</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                  placeholder="Enter your website URL"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 ${formErrors.address ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter your business address"
                />
                {formErrors.address && <p className="text-red-500 text-xs mt-1">{formErrors.address}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 ${formErrors.city ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter your city"
                />
                {formErrors.city && <p className="text-red-500 text-xs mt-1">{formErrors.city}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 ${formErrors.state ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter your state"
                />
                {formErrors.state && <p className="text-red-500 text-xs mt-1">{formErrors.state}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                <select
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 ${formErrors.country ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="ES">Spain</option>
                  <option value="IT">Italy</option>
                  <option value="NL">Netherlands</option>
                  <option value="SE">Sweden</option>
                </select>
                {formErrors.country && <p className="text-red-500 text-xs mt-1">{formErrors.country}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 ${formErrors.postalCode ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter your postal code"
                />
                {formErrors.postalCode && <p className="text-red-500 text-xs mt-1">{formErrors.postalCode}</p>}
              </div>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowInlineForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingForm}
                className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingForm ? 'Processing...' : 'Next'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        {setupStatus === 'idle' && !showInlineForm && (
          <div className="space-y-2">
            <button
              onClick={useExistingCredentials}
              className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Use Existing Business Info</span>
            </button>
            <p className="text-center text-xs text-gray-500">or</p>
            <button
              onClick={handleCreateNewAccount}
              className="w-full flex items-center justify-center space-x-2 bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Building2 className="w-4 h-4" />
              <span>Enter Business Information</span>
            </button>
          </div>
        )}

        {setupStatus === 'creating' && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-lg">
              <Loader className="w-5 h-5 animate-spin" />
              <span className="font-medium">Creating Account...</span>
            </div>
          </div>
        )}

        {(setupStatus === 'completed' || setupStatus === 'using_existing') && ghlConfig && (
          <div className="space-y-3">
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Business Info Ready!</span>
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
          Skip Business Setup for now
        </button>
      </div>
    </div>
  );
};

export default EnhancedChatGHLSetup;