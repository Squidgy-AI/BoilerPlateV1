// src/components/EnhancedChatGHLSetup.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Building2, Users, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/utils/getUserId';
import { getGHLCredentials } from '@/constants/ghlCredentials';

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
  // GHL automation credentials (for Facebook integration)
  ghl_automation_email?: string;
  ghl_automation_password?: string;
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

interface LogoState {
  faviconUrl: string | null;
  faviconStatus: 'loading' | 'found' | 'error' | 'not_found';
  userApprovedFavicon: boolean | null;
  uploadedLogoUrl: string | null;
  showLogoUpload: boolean;
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
  
  // Logo handling state
  const [logoState, setLogoState] = useState<LogoState>({
    faviconUrl: null,
    faviconStatus: 'not_found',
    userApprovedFavicon: null,
    uploadedLogoUrl: null,
    showLogoUpload: false
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check if we already have GHL credentials
    checkExistingGHLSetup();
    // Check if we have existing business profile with logo
    checkExistingBusinessProfile();
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

  const checkExistingBusinessProfile = async () => {
    try {
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        return;
      }

      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://squidgy-back-919bc0659e35.herokuapp.com'
        : 'http://localhost:8000';

      const response = await fetch(`${backendUrl}/api/business/profile/${userIdResult.user_id}`);
      const result = await response.json();
      
      if (result.status === 'success' && result.business_profile) {
        const profile = result.business_profile;
        
        // Pre-fill form with existing data
        setFormData({
          businessName: profile.business_name || '',
          businessEmail: profile.business_email || '',
          phone: profile.phone || '',
          website: profile.website || '',
          address: profile.address || '',
          city: profile.city || '',
          state: profile.state || '',
          country: profile.country || 'US',
          postalCode: profile.postal_code || ''
        });

        // Set logo state if we have logos
        if (profile.logo_url || profile.favicon_url) {
          setLogoState(prev => ({
            ...prev,
            faviconUrl: profile.favicon_url,
            uploadedLogoUrl: profile.logo_url,
            faviconStatus: profile.favicon_url ? 'found' : 'not_found',
            userApprovedFavicon: profile.logo_url ? null : (profile.favicon_url ? true : null)
          }));
        }
      }
    } catch (error) {
      console.error('Error checking existing business profile:', error);
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
      
      // Use form data if available, otherwise use demo values
      const requestPayload = {
        company_id: "lp2p1q27DrdGta1qGDJd",
        snapshot_id: "bInwX5BtZM6oEepAsUwo",
        agency_token: "pit-e3d8d384-00cb-4744-8213-b1ab06ae71fe",
        subaccount_name: formData.businessName || `DemoSolarBusiness_${randomNum}`,
        prospect_email: formData.businessEmail || `demo+${randomNum}@example.com`,
        prospect_first_name: formData.businessName?.split(' ')[0] || 'Demo',
        prospect_last_name: formData.businessName?.split(' ').slice(1).join(' ') || 'Business',
        phone: formData.phone || "+1-555-SOLAR-1",
        website: formData.website || 'https://demo-solar.com',
        address: formData.address || "123 Solar Business Ave",
        city: formData.city || "Solar City",
        state: formData.state || "CA",
        country: formData.country || "US",
        postal_code: formData.postalCode || "90210",
        timezone: 'America/Los_Angeles',
        allow_duplicate_contact: false,
        allow_duplicate_opportunity: false,
        allow_facebook_name_merge: true,
        disable_contact_timezone: false
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
        
        // Check if it's a "user already exists" error
        const isUserExistsError = errorText.includes('user with this email already exists') || 
                                  errorText.includes('A user with this email already exists');
        
        if (isUserExistsError) {
          addMessage('bot', '⚠️ User already exists, continuing with existing account...');
          addMessage('bot', '📝 Account setup requires manual completion due to existing user. Please contact support if needed.');
          return; // Exit gracefully instead of throwing error
        }
        
        throw new Error(`Failed to create account: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.status === 'success') {
        // Extract real location_id from backend response
        const realLocationId = result.subaccount.location_id;
        // Use business_user as primary, since it's the actual business owner
        const businessUser = result.business_user;
        const somaUser = result.soma_user;
        
        // Get GHL automation credentials
        const ghlCreds = getGHLCredentials();
        
        const realGHLConfig: GHLSetupConfig = {
          location_id: realLocationId,
          user_id: businessUser.user_id, // Primary business user
          location_name: `SolarBusiness_${realLocationId}`, // Use location_id in name as you requested
          user_name: businessUser.details.name || "Solar Sales Manager",
          user_email: businessUser.details.email || `sa+${randomNum}@squidgy.ai`,
          setup_status: 'completed',
          created_at: new Date().toISOString(),
          // Add GHL automation credentials for Facebook integration
          ghl_automation_email: ghlCreds.email,
          ghl_automation_password: ghlCreds.password
        };

        setGhlConfig(realGHLConfig);
        setSetupStatus('completed');
        
        addMessage('bot', '✅ Account created successfully!', true, 'creation_complete');
        addMessage('bot', `🎉 **Dynamic Account Details:**\n📍 **Location ID:** ${realGHLConfig.location_id}\n🏢 **Location Name:** ${realGHLConfig.location_name}\n👤 **Business User:** ${realGHLConfig.user_name} (${realGHLConfig.user_email})\n🔧 **Automation Email:** ${realGHLConfig.ghl_automation_email}\n\n✨ Account created with dynamic credentials ready for Facebook integration!`);
      } else {
        throw new Error('Backend returned failure status');
      }

    } catch (error: any) {
      console.error('Real GHL creation failed:', error);
      throw error;
    }
  };

  const useExistingCredentials = async () => {
    // Use hardcoded working credentials (keep this unchanged)
    addMessage('user', 'Use Working Credentials');
    addMessage('bot', '✅ Using known working credentials for testing...');
    
    // Set hardcoded working config directly
    const workingConfig: GHLSetupConfig = {
      location_id: 'rlRJ1n5Hoy3X53WDOJlq',
      user_id: 'MHwz5yMaG0JrTfGXjvxB',
      location_name: 'Solar Demo Location',
      user_name: 'Solar Sales Specialist',
      user_email: 'somashekhar34+rlRJ1n5H@gmail.com',
      setup_status: 'completed',
      created_at: new Date().toISOString(),
      // Keep hardcoded automation credentials for working demo
      ghl_automation_email: 'somashekhar34+rlRJ1n5H@gmail.com',
      ghl_automation_password: 'Dummy@123'
    };
    
    setGhlConfig(workingConfig);
    setSetupStatus('completed');
    
    addMessage('bot', `🎯 **Working Credentials Applied:**\n📍 **Location ID:** ${workingConfig.location_id}\n👤 **User ID:** ${workingConfig.user_id}\n📧 **Email:** ${workingConfig.user_email}\n\n✅ Ready for Facebook integration with tested credentials!`);
  };

  const saveFinalConfiguration = async (config: GHLSetupConfig) => {
    try {
      console.log('🔍 Starting saveFinalConfiguration with config:', config);
      
      const userIdResult = await getUserId();
      console.log('🔍 getUserId result:', userIdResult);
      
      if (!userIdResult.success || !userIdResult.user_id) {
        const errorMsg = `Failed to get user ID: ${userIdResult.error || 'Unknown error'}`;
        console.error('❌ User ID error:', errorMsg);
        throw new Error(errorMsg);
      }

      // Prepare payload with correct database schema
      const dbPayload = {
        firm_user_id: userIdResult.user_id,
        agent_id: 'SOLAgent',
        agent_name: 'Solar Sales Specialist',
        setup_type: 'GHLSetup', // Required NOT NULL column
        setup_json: config,
        is_enabled: true,
        session_id: sessionId && sessionId.includes('_') ? null : sessionId,
        created_at: new Date().toISOString()
      };
      
      console.log('🔍 Database payload:', dbPayload);

      // Save to database with proper conflict resolution
      const { data, error } = await supabase
        .from('squidgy_agent_business_setup')
        .upsert(dbPayload, {
          onConflict: 'firm_user_id,agent_id,setup_type',
          ignoreDuplicates: false
        });

      console.log('🔍 Database response:', { data, error });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log('✅ Configuration saved successfully');
      onConfigurationComplete(config);
      
    } catch (error) {
      console.error('❌ Error in saveFinalConfiguration:', error);
      throw error;
    }
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
      snapshot_id: "bInwX5BtZM6oEepAsUwo",  // SOL - Solar Assistant snapshot
      agency_token: "pit-e3d8d384-00cb-4744-8213-b1ab06ae71fe",
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
        
        // Get GHL automation credentials for Facebook integration
        const ghlCreds = getGHLCredentials();
        
        const newConfig: GHLSetupConfig = {
          location_id: result.subaccount.location_id,
          user_id: businessUser.user_id, // Use business user as primary
          location_name: result.subaccount.subaccount_name || formData.businessName,
          user_name: businessUser.details.name || formData.businessName,
          user_email: businessUser.details.email || formData.businessEmail,
          setup_status: 'completed',
          created_at: new Date().toISOString(),
          // Add GHL automation credentials for Facebook integration
          ghl_automation_email: ghlCreds.email,
          ghl_automation_password: ghlCreds.password
        };
        setGhlConfig(newConfig);
        
        // Save business profile with logo information
        await saveBusinessProfile(newConfig);
        
        addMessage('bot', `🎉 **Dynamic Business Account Created:**\n📍 **Location ID:** ${newConfig.location_id}\n🏢 **Business:** ${newConfig.location_name}\n👤 **Business User:** ${newConfig.user_name} (${newConfig.user_email})\n🔧 **Automation Email:** ${newConfig.ghl_automation_email}\n\n✨ Account created with dynamic credentials ready for Facebook integration!`);
      } else {
        // Check if it's a "user already exists" error
        const errorMessage = result.detail || result.message || 'Unknown error';
        const isUserExistsError = errorMessage.includes('user with this email already exists') || 
                                  errorMessage.includes('A user with this email already exists');
        
        if (isUserExistsError) {
          addMessage('bot', '⚠️ User already exists, continuing with existing account...');
          
          // Try to extract what information we can from the error response
          // You might want to call a "get existing user" endpoint here if available
          console.log('User already exists, attempting to continue with existing user');
          
          // For now, show a message that setup needs manual completion
          addMessage('bot', '📝 Account setup requires manual completion due to existing user. Please contact support if needed.');
          setShowInlineForm(false);
          return;
        }
        
        console.error('Account Creation Failed:', {
          status: response.status,
          error: errorMessage,
          fullResponse: result
        });
        
        throw new Error(errorMessage);
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
    
    // Auto-capture favicon when website URL is entered
    if (field === 'website' && value && value.startsWith('http')) {
      captureFavicon(value);
    }
  };

  const captureFavicon = async (websiteUrl: string) => {
    setLogoState(prev => ({ ...prev, faviconStatus: 'loading' }));
    
    try {
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        throw new Error('User ID required for favicon capture');
      }

      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://squidgy-back-919bc0659e35.herokuapp.com'
        : 'http://localhost:8000';

      // Capture both favicon and screenshot in parallel
      const [faviconResponse, screenshotResponse] = await Promise.all([
        fetch(`${backendUrl}/api/website/favicon`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: websiteUrl,
            session_id: sessionId,
            user_id: userIdResult.user_id  // Add user_id for database storage
          })
        }),
        fetch(`${backendUrl}/api/website/screenshot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: websiteUrl,
            session_id: sessionId,
            user_id: userIdResult.user_id  // Add user_id for database storage
          })
        })
      ]);

      const [faviconResult, screenshotResult] = await Promise.all([
        faviconResponse.json(),
        screenshotResponse.json()
      ]);
      
      if (faviconResult.status === 'success' && faviconResult.favicon_url) {
        setLogoState(prev => ({
          ...prev,
          faviconUrl: faviconResult.favicon_url,
          faviconStatus: 'found'
        }));
        addMessage('bot', '🎨 Found your website logo! Please check if this looks good for your business.');
      } else {
        setLogoState(prev => ({
          ...prev,
          faviconStatus: 'not_found',
          showLogoUpload: true
        }));
        addMessage('bot', '📷 Could not find a logo on your website. You can upload your business logo below.');
      }
    } catch (error) {
      console.error('Error capturing favicon:', error);
      setLogoState(prev => ({
        ...prev,
        faviconStatus: 'error',
        showLogoUpload: true
      }));
      addMessage('bot', '⚠️ Could not capture logo from website. Please upload your business logo.');
    }
  };

  const handleLogoApproval = (approved: boolean) => {
    setLogoState(prev => ({
      ...prev,
      userApprovedFavicon: approved,
      showLogoUpload: !approved
    }));
    
    if (approved) {
      addMessage('bot', '✅ Great! We\'ll use your website logo.');
    } else {
      addMessage('bot', '📁 Please upload your business logo below.');
    }
  };

  const handleLogoUpload = async (file: File) => {
    try {
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://squidgy-back-919bc0659e35.herokuapp.com'
        : 'http://localhost:8000';

      const formData = new FormData();
      formData.append('logo', file);
      formData.append('session_id', sessionId || '');

      const response = await fetch(`${backendUrl}/api/business/upload-logo`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.status === 'success' && result.logo_url) {
        setLogoState(prev => ({
          ...prev,
          uploadedLogoUrl: result.logo_url,
          showLogoUpload: false
        }));
        addMessage('bot', '✅ Logo uploaded successfully!');
        
        // Auto-save to business profile if we have user data
        await updateLogoInDatabase(result.logo_url);
      } else {
        addMessage('bot', '❌ Failed to upload logo. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      addMessage('bot', '❌ Error uploading logo. Please try again.');
    }
  };

  const updateLogoInDatabase = async (logoUrl: string) => {
    try {
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        return;
      }

      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://squidgy-back-919bc0659e35.herokuapp.com'
        : 'http://localhost:8000';

      // Get existing business profile or create minimal one with logo
      const businessProfileData = {
        firm_user_id: userIdResult.user_id,
        business_name: formData.businessName || 'My Business',
        business_email: formData.businessEmail || 'contact@mybusiness.com',
        phone: formData.phone,
        website: formData.website,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country || 'US',
        postal_code: formData.postalCode,
        logo_url: logoUrl,
        favicon_url: logoState.faviconUrl
      };

      const response = await fetch(`${backendUrl}/api/business/save-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(businessProfileData)
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        console.log('✅ Logo updated in business profile successfully');
      } else {
        console.error('❌ Failed to update logo in business profile:', result);
      }
    } catch (error) {
      console.error('Error updating logo in database:', error);
    }
  };

  const saveBusinessProfile = async (ghlConfig: GHLSetupConfig) => {
    try {
      const userIdResult = await getUserId();
      if (!userIdResult.success || !userIdResult.user_id) {
        throw new Error('Failed to get user ID');
      }

      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://squidgy-back-919bc0659e35.herokuapp.com'
        : 'http://localhost:8000';

      // Determine which logo to use
      const logoUrl = logoState.userApprovedFavicon && logoState.faviconUrl 
        ? logoState.faviconUrl 
        : logoState.uploadedLogoUrl;

      const businessProfileData = {
        firm_user_id: userIdResult.user_id,
        business_name: formData.businessName,
        business_email: formData.businessEmail,
        phone: formData.phone,
        website: formData.website,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        postal_code: formData.postalCode,
        logo_url: logoUrl,
        screenshot_url: null, // Will be captured later if needed
        favicon_url: logoState.faviconUrl
      };

      const response = await fetch(`${backendUrl}/api/business/save-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(businessProfileData)
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        console.log('✅ Business profile saved successfully:', result);
        addMessage('bot', '💾 Business profile saved successfully!');
      } else {
        console.error('❌ Failed to save business profile:', result);
        addMessage('bot', '⚠️ Warning: Failed to save business profile details.');
      }
    } catch (error) {
      console.error('Error saving business profile:', error);
      addMessage('bot', '⚠️ Warning: Could not save business profile details.');
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

      // Save to the squidgy_agent_business_setup table with proper conflict resolution
      // Include GHL credentials in its own columns
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
          updated_at: new Date().toISOString(),
          ghl_location_id: ghlConfig.location_id,
          ghl_user_id: ghlConfig.user_id
        }, {
          onConflict: 'firm_user_id,agent_id,setup_type',
          ignoreDuplicates: false
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

      {/* Logo Section - Always Visible */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Business Logo</h4>
        
        {/* Show existing logo if found */}
        {(logoState.faviconUrl || logoState.uploadedLogoUrl) ? (
          <div className="space-y-3">
            {/* Current Logo Display */}
            <div className="flex items-center space-x-4 p-3 bg-white border rounded-lg">
              <img 
                src={logoState.uploadedLogoUrl || logoState.faviconUrl} 
                alt="Business logo" 
                className="w-16 h-16 object-contain border rounded-lg bg-gray-50 p-2"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  {logoState.uploadedLogoUrl ? 'Uploaded Business Logo' : 'Website Logo'}
                </p>
                <p className="text-xs text-gray-600">
                  {logoState.uploadedLogoUrl ? 'Custom logo you uploaded' : 'Captured from your website'}
                </p>
              </div>
              <div className="text-green-600">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            
            {/* Ask if this is correct */}
            {logoState.userApprovedFavicon === null && logoState.faviconUrl && !logoState.uploadedLogoUrl && (
              <div className="space-y-2">
                <p className="text-sm text-gray-700">Is this your business logo?</p>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleLogoApproval(true)}
                    className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                  >
                    ✅ Yes, use this
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLogoApproval(false)}
                    className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                  >
                    ❌ No, upload different
                  </button>
                </div>
              </div>
            )}
            
            {/* Option to change logo */}
            <button
              type="button"
              onClick={() => setLogoState(prev => ({ ...prev, showLogoUpload: true }))}
              className="text-xs text-orange-600 hover:text-orange-700 underline"
            >
              Upload a different logo
            </button>
          </div>
        ) : (
          /* No logo found - Show upload option */
          <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-gray-400 mb-2">
              <Building2 className="w-8 h-8 mx-auto" />
            </div>
            <p className="text-sm text-gray-600 mb-3">No business logo found</p>
            <button
              type="button"
              onClick={() => setLogoState(prev => ({ ...prev, showLogoUpload: true }))}
              className="px-4 py-2 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 transition-colors"
            >
              Upload Business Logo
            </button>
          </div>
        )}

        {/* Logo Upload Modal/Section */}
        {logoState.showLogoUpload && (
          <div className="mt-4 p-4 border border-orange-200 bg-orange-50 rounded-lg">
            <h5 className="text-sm font-medium text-orange-800 mb-3">Upload Business Logo</h5>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleLogoUpload(file);
                  setLogoState(prev => ({ ...prev, showLogoUpload: false }));
                }
              }}
              className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white"
            />
            <p className="text-xs text-orange-600 mt-2">Supported: JPG, PNG, GIF (max 5MB)</p>
            <button
              type="button"
              onClick={() => setLogoState(prev => ({ ...prev, showLogoUpload: false }))}
              className="mt-2 text-xs text-orange-600 hover:text-orange-700 underline"
            >
              Cancel
            </button>
          </div>
        )}
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

              {/* Logo Section */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                <h4 className="text-sm font-medium text-gray-700">Business Logo</h4>
                
                {/* Favicon Loading State */}
                {logoState.faviconStatus === 'loading' && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <span className="text-sm">Capturing logo from website...</span>
                  </div>
                )}

                {/* Favicon Found - Show for Approval */}
                {logoState.faviconStatus === 'found' && logoState.faviconUrl && logoState.userApprovedFavicon === null && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">We found this logo on your website:</p>
                    <div className="flex items-center space-x-4">
                      <img 
                        src={logoState.faviconUrl} 
                        alt="Website favicon" 
                        className="w-16 h-16 object-contain border rounded-lg bg-white p-2"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          setLogoState(prev => ({ ...prev, faviconStatus: 'error' }));
                        }}
                      />
                      <div className="space-y-2">
                        <p className="text-sm text-gray-700">Is this your business logo?</p>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => handleLogoApproval(true)}
                            className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                          >
                            ✅ Yes, use this
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLogoApproval(false)}
                            className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                          >
                            ❌ No, upload different
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show Approved Favicon */}
                {logoState.userApprovedFavicon === true && logoState.faviconUrl && (
                  <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <img 
                      src={logoState.faviconUrl} 
                      alt="Approved website logo" 
                      className="w-12 h-12 object-contain border rounded bg-white p-1"
                    />
                    <div>
                      <p className="text-sm font-medium text-green-800">✅ Website logo approved</p>
                      <p className="text-xs text-green-600">This logo will be used for your business</p>
                    </div>
                  </div>
                )}

                {/* Logo Upload Section */}
                {(logoState.showLogoUpload || logoState.faviconStatus === 'not_found' || logoState.faviconStatus === 'error') && !logoState.uploadedLogoUrl && logoState.userApprovedFavicon !== true && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">Upload your business logo:</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                    />
                    <p className="text-xs text-gray-500">Supported formats: JPG, PNG, GIF (max 5MB)</p>
                  </div>
                )}

                {/* Show Uploaded Logo */}
                {logoState.uploadedLogoUrl && (
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <img 
                      src={logoState.uploadedLogoUrl} 
                      alt="Uploaded business logo" 
                      className="w-12 h-12 object-contain border rounded bg-white p-1"
                    />
                    <div>
                      <p className="text-sm font-medium text-blue-800">✅ Logo uploaded successfully</p>
                      <p className="text-xs text-blue-600">This logo will be used for your business</p>
                    </div>
                  </div>
                )}
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
              <span>Use Working Demo Credentials</span>
            </button>
            <p className="text-center text-xs text-gray-500">or</p>
            <button
              onClick={handleCreateNewAccount}
              className="w-full flex items-center justify-center space-x-2 bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Building2 className="w-4 h-4" />
              <span>Create New Business Account</span>
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
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSetupStatus('idle');
                  setGhlConfig(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Edit Setup
              </button>
              <button
                onClick={completeSetup}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center space-x-2 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                <Users className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Continue to Solar Setup'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Skip removed for mandatory setup */}
      </div>
    </div>
  );
};

export default EnhancedChatGHLSetup;