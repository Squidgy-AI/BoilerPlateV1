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
  ghl_location_id?: string;
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

    // Use direct Supabase with proper setup_type field
    const { supabase } = await import('@/lib/supabase');

    // Simple database read - get config by profile user_id, agent_id, and setup_type
    const { data } = await supabase
      .from('squidgy_agent_business_setup')
      .select('setup_json')
      .eq('firm_user_id', userIdResult.user_id)
      .eq('agent_id', 'SOLAgent')
      .eq('setup_type', 'SolarSetup')
      .single();
    
    if (data && data.setup_json) {
      console.log('Solar config loaded from database');
      // Also update localStorage for offline access
      saveSolarConfig(data.setup_json);
      return data.setup_json;
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
    
    // Use direct Supabase calls with proper setup_type field
    const { supabase } = await import('@/lib/supabase');
    
    console.log('🚀 USING DIRECT SUPABASE INSERT WITH setup_type');
    console.log('- user_id:', userIdResult.user_id);
    console.log('- agent_id: SOLAgent');
    console.log('- setup_type: SolarSetup');
    console.log('- config keys:', Object.keys(config));
    
    // Upsert into public schema table using profile.user_id with proper conflict resolution
    const { data, error } = await supabase
      .from('squidgy_agent_business_setup')
      .upsert({
        firm_id: null,
        firm_user_id: userIdResult.user_id,
        agent_id: 'SOLAgent',
        agent_name: 'Solar Sales Specialist',
        setup_type: 'SolarSetup',
        setup_json: config,
        is_enabled: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'firm_user_id,agent_id,setup_type',
        ignoreDuplicates: false
      })
      .select();
    
    console.log('📥 Supabase operation result:', { data, error });
    
    if (error) {
      console.error('❌ Failed to save to database:', error);
      return false;
    }

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

    // Use direct Supabase for test insert
    const { supabase } = await import('@/lib/supabase');

    // Upsert into public schema table using profile.user_id with proper conflict resolution
    const { data, error } = await supabase
      .from('squidgy_agent_business_setup')
      .upsert({
        firm_id: null,
        firm_user_id: userIdResult.user_id,
        agent_id: 'SOLAgent',
        agent_name: 'Solar Sales Specialist',
        setup_type: 'SolarSetup',
        setup_json: testConfig,
        is_enabled: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'firm_user_id,agent_id,setup_type',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('❌ Database insert test failed:', error);
      return false;
    }

    console.log('✅ Database insert test passed:', data);
    console.log('📊 Direct Supabase working correctly for solar config saves');
    
    return true;
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  }
};