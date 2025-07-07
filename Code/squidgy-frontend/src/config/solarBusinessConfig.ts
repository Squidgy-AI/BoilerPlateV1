// src/config/solarBusinessConfig.ts

export interface SolarBusinessParameter {
  key: string;
  name: string;
  description: string;
  defaultValue: number | boolean;
  type: 'number' | 'boolean' | 'percentage' | 'currency';
  category: 'pricing' | 'financing' | 'energy' | 'installation' | 'incentives';
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  required: boolean;
}

export interface SolarBusinessConfig {
  installationPricePerWatt: number;
  dealerFeePercent: number;
  brokerFee: number;
  cashPurchaseEnabled: boolean;
  financedPurchaseEnabled: boolean;
  financingApr: number;
  financingTermMonths: number;
  energyPricePerKwh: number;
  yearlyElectricCostIncreasePercent: number;
  installationLifespanYears: number;
  typicalPanelCount: number;
  maxRoofSegments: number;
  solarIncentivePercent: number;
}

export const SOLAR_BUSINESS_PARAMETERS: SolarBusinessParameter[] = [
  // Pricing Parameters
  {
    key: 'installationPricePerWatt',
    name: 'Installation Price Per Watt',
    description: 'Base price charged per watt of solar panel capacity',
    defaultValue: 2.00,
    type: 'currency',
    category: 'pricing',
    unit: '$/watt',
    min: 0.50,
    max: 10.00,
    step: 0.01,
    required: true
  },
  {
    key: 'dealerFeePercent',
    name: 'Dealer Fee Percentage',
    description: 'Percentage markup added to base installation price (e.g., 0.15 for 15%)',
    defaultValue: 0.15,
    type: 'percentage',
    category: 'pricing',
    unit: '%',
    min: 0,
    max: 1,
    step: 0.01,
    required: true
  },
  {
    key: 'brokerFee',
    name: 'Broker Fee',
    description: 'Flat fee added to each installation',
    defaultValue: 0,
    type: 'currency',
    category: 'pricing',
    unit: '$',
    min: 0,
    max: 10000,
    step: 1,
    required: true
  },

  // Payment Options
  {
    key: 'cashPurchaseEnabled',
    name: 'Cash Purchase Enabled',
    description: 'Whether to offer cash payment option to customers',
    defaultValue: true,
    type: 'boolean',
    category: 'financing',
    required: true
  },
  {
    key: 'financedPurchaseEnabled',
    name: 'Financed Purchase Enabled',
    description: 'Whether to offer loan financing option to customers',
    defaultValue: true,
    type: 'boolean',
    category: 'financing',
    required: true
  },

  // Financing Parameters
  {
    key: 'financingApr',
    name: 'Financing APR',
    description: 'Annual percentage rate for customer financing (e.g., 0.05 for 5%)',
    defaultValue: 0.05,
    type: 'percentage',
    category: 'financing',
    unit: '%',
    min: 0,
    max: 0.30,
    step: 0.001,
    required: true
  },
  {
    key: 'financingTermMonths',
    name: 'Financing Term Months',
    description: 'Standard loan term in months',
    defaultValue: 240,
    type: 'number',
    category: 'financing',
    unit: 'months',
    min: 12,
    max: 360,
    step: 12,
    required: true
  },

  // Energy Parameters
  {
    key: 'energyPricePerKwh',
    name: 'Energy Price Per kWh',
    description: 'Current local electricity rate per kilowatt-hour',
    defaultValue: 0.17,
    type: 'currency',
    category: 'energy',
    unit: '$/kWh',
    min: 0.01,
    max: 1.00,
    step: 0.001,
    required: true
  },
  {
    key: 'yearlyElectricCostIncreasePercent',
    name: 'Yearly Electric Cost Increase Percentage',
    description: 'Expected annual utility rate increase (e.g., 0.04 for 4%)',
    defaultValue: 0.04,
    type: 'percentage',
    category: 'energy',
    unit: '%',
    min: 0,
    max: 0.20,
    step: 0.001,
    required: true
  },

  // Installation Parameters
  {
    key: 'installationLifespanYears',
    name: 'Installation Lifespan Years',
    description: 'Expected operational lifetime of solar installations',
    defaultValue: 20,
    type: 'number',
    category: 'installation',
    unit: 'years',
    min: 10,
    max: 30,
    step: 1,
    required: true
  },
  {
    key: 'typicalPanelCount',
    name: 'Typical Panel Count',
    description: 'Standard number of panels for average installation',
    defaultValue: 40,
    type: 'number',
    category: 'installation',
    unit: 'panels',
    min: 1,
    max: 200,
    step: 1,
    required: true
  },
  {
    key: 'maxRoofSegments',
    name: 'Maximum Roof Segments',
    description: 'Maximum number of roof sections to use for installations',
    defaultValue: 4,
    type: 'number',
    category: 'installation',
    unit: 'segments',
    min: 1,
    max: 10,
    step: 1,
    required: true
  },

  // Incentives
  {
    key: 'solarIncentivePercent',
    name: 'Solar Incentive Percentage',
    description: 'Tax credit percentage available (e.g., 0.30 for 30%)',
    defaultValue: 0.30,
    type: 'percentage',
    category: 'incentives',
    unit: '%',
    min: 0,
    max: 1,
    step: 0.01,
    required: true
  }
];

export const DEFAULT_SOLAR_CONFIG: SolarBusinessConfig = {
  installationPricePerWatt: 2.00,
  dealerFeePercent: 0.15,
  brokerFee: 0,
  cashPurchaseEnabled: true,
  financedPurchaseEnabled: true,
  financingApr: 0.05,
  financingTermMonths: 240,
  energyPricePerKwh: 0.17,
  yearlyElectricCostIncreasePercent: 0.04,
  installationLifespanYears: 20,
  typicalPanelCount: 40,
  maxRoofSegments: 4,
  solarIncentivePercent: 0.30
};

// Helper functions
export const getSolarConfig = (): SolarBusinessConfig => {
  const savedConfig = localStorage.getItem('solarBusinessConfig');
  if (savedConfig) {
    try {
      return { ...DEFAULT_SOLAR_CONFIG, ...JSON.parse(savedConfig) };
    } catch (error) {
      console.error('Error parsing saved solar config:', error);
    }
  }
  return DEFAULT_SOLAR_CONFIG;
};

export const saveSolarConfig = (config: SolarBusinessConfig): void => {
  localStorage.setItem('solarBusinessConfig', JSON.stringify(config));
  console.log('Solar business config saved to localStorage:', config);
};

// Async helper to get config from DB or localStorage
export const getSolarConfigAsync = async (): Promise<SolarBusinessConfig> => {
  try {
    const { getUserId } = await import('@/utils/getUserId');
    
    // Get the correct user_id from profiles table
    const userIdResult = await getUserId();
    
    if (!userIdResult.success || !userIdResult.user_id) {
      console.log('No authenticated user or failed to get user_id, falling back to localStorage');
      return getSolarConfig();
    }

    // Use backend API to get setup data
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE?.startsWith('http') 
      ? process.env.NEXT_PUBLIC_API_BASE 
      : 'https://squidgy-back-919bc0659e35.herokuapp.com';
    
    const response = await fetch(`${backendUrl}/api/agents/setup?user_id=${userIdResult.user_id}&agent_id=SOLAgent&setup_type=SolarSetup`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      if (result.status === 'success' && result.data && result.data.setup_data) {
        console.log('Solar config loaded from database');
        // Also update localStorage for offline access
        saveSolarConfig(result.data.setup_data);
        return result.data.setup_data;
      }
    }
  } catch (error) {
    console.error('Error fetching config from database:', error);
  }
  
  // Fallback to localStorage
  return getSolarConfig();
};

// Async helper to save config to both DB and localStorage
export const saveSolarConfigAsync = async (config: SolarBusinessConfig): Promise<boolean> => {
  // Save to localStorage immediately
  saveSolarConfig(config);
  
  try {
    const { getUserId } = await import('@/utils/getUserId');
    
    // Get the correct user_id from profiles table
    const userIdResult = await getUserId();
    
    if (!userIdResult.success || !userIdResult.user_id) {
      console.error('No authenticated user or failed to get user_id, cannot save to database');
      return false;
    }

    console.log('Attempting to save solar config to database for profile user_id:', userIdResult.user_id);
    console.log('Config to save:', config);
    
    // Use backend API instead of direct Supabase calls
    const requestData = {
      user_id: userIdResult.user_id,
      agent_id: 'SOLAgent',
      agent_name: 'Solar Sales Specialist',
      setup_type: 'SolarSetup',
      setup_data: config,
      session_id: null,
      is_enabled: true
    };
    
    console.log('🚀 REQUEST DATA BEING SENT TO BACKEND:');
    console.log('- user_id:', requestData.user_id);
    console.log('- agent_id:', requestData.agent_id);
    console.log('- setup_type:', requestData.setup_type);
    console.log('- setup_data keys:', Object.keys(requestData.setup_data));
    console.log('- Full request data:', JSON.stringify(requestData, null, 2));
    
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE?.startsWith('http') 
      ? process.env.NEXT_PUBLIC_API_BASE 
      : 'https://squidgy-back-919bc0659e35.herokuapp.com';
    
    console.log('🌐 Backend URL:', backendUrl);
    console.log('📡 Making POST request to:', `${backendUrl}/api/agents/setup`);
    
    const response = await fetch(`${backendUrl}/api/agents/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    console.log('📥 Response status:', response.status, response.statusText);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to save to database: HTTP', response.status, response.statusText);
      console.error('❌ Error response body:', errorText);
      return false;
    }

    const result = await response.json();
    console.log('📥 Backend response:', JSON.stringify(result, null, 2));
    
    if (result.status !== 'success') {
      console.error('❌ Failed to save to database:', result.message || 'Unknown error from backend');
      console.error('❌ Full error result:', result);
      return false;
    }
    
    const data = result.agent;

    console.log('✅ Solar config saved to database successfully!');
    console.log('✅ Record inserted:', data);
    return true;
  } catch (error) {
    console.error('Error saving config to database:', error);
    return false;
  }
};

export const getParametersByCategory = (category: string): SolarBusinessParameter[] => {
  return SOLAR_BUSINESS_PARAMETERS.filter(param => param.category === category);
};

export const formatParameterValue = (param: SolarBusinessParameter, value: number | boolean): string => {
  if (typeof value === 'boolean') {
    return value ? 'Enabled' : 'Disabled';
  }
  
  switch (param.type) {
    case 'currency':
      return `$${value.toFixed(param.step && param.step < 1 ? 3 : 2)}`;
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    default:
      return `${value}${param.unit ? ' ' + param.unit : ''}`;
  }
};

export const CATEGORY_INFO = {
  pricing: {
    title: 'Pricing Configuration',
    description: 'Set your base pricing structure and fees',
    icon: '💰'
  },
  financing: {
    title: 'Financing Options',
    description: 'Configure payment and loan options for customers',
    icon: '🏦'
  },
  energy: {
    title: 'Energy Parameters',
    description: 'Set local energy rates and cost projections',
    icon: '⚡'
  },
  installation: {
    title: 'Installation Settings',
    description: 'Configure standard installation parameters',
    icon: '🔧'
  },
  incentives: {
    title: 'Incentives & Credits',
    description: 'Set available tax credits and incentives',
    icon: '🎯'
  }
};

// Test function to verify database insert is working (uses backend API)
export const testDatabaseInsert = async (): Promise<boolean> => {
  console.log('🧪 Testing database insert via backend API...');
  
  try {
    const { getUserId } = await import('@/utils/getUserId');
    
    // Get the correct user_id from profiles table
    const userIdResult = await getUserId();
    
    if (!userIdResult.success || !userIdResult.user_id) {
      console.error('❌ No authenticated user for testing');
      return false;
    }

    console.log('✅ User authenticated, profile user_id:', userIdResult.user_id);

    // Test config
    const testConfig = DEFAULT_SOLAR_CONFIG;

    // Use backend API for test insert
    const requestData = {
      user_id: userIdResult.user_id,
      agent_id: 'SOLAgent',
      agent_name: 'Solar Sales Specialist',
      setup_type: 'SolarSetup',
      setup_data: testConfig,
      session_id: null,
      is_enabled: true
    };
    
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE?.startsWith('http') 
      ? process.env.NEXT_PUBLIC_API_BASE 
      : 'https://squidgy-back-919bc0659e35.herokuapp.com';
    
    const response = await fetch(`${backendUrl}/api/agents/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      console.error('❌ Database insert test failed: HTTP', response.status, response.statusText);
      return false;
    }

    const result = await response.json();
    
    if (result.status !== 'success') {
      console.error('❌ Database insert test failed:', result.message || 'Unknown error from backend');
      return false;
    }

    console.log('✅ Database insert test passed:', result.agent);
    console.log('📊 Backend API working correctly for solar config saves');
    
    return true;
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  }
};