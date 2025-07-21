import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SOLAR_CONFIG = {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Testing solar config database insert...');

    // Create regular supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // For testing, we need to get an actual user profile
    // In a real scenario, this would come from authenticated user
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id')
      .limit(1);
    
    if (profilesError || !profiles || profiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No profiles found for testing. Please create a user account first.',
        profilesError: profilesError?.message
      });
    }

    const testUserId = profiles[0].user_id;

    console.log('✅ Using profile user_id for testing:', testUserId);
    console.log('✅ Test config:', DEFAULT_SOLAR_CONFIG);

    // First create the table if it doesn't exist
    console.log('🛠️ Creating table if needed...');
    
    // Try to query the table to see if it exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('squidgy_agent_business_setup')
      .select('*')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      // Table doesn't exist, we need to create it
      console.log('❌ Table does not exist in public schema');
      console.log('💡 You need to create the table in public schema first');
      
      return res.status(200).json({
        success: false,
        message: 'Table does not exist',
        tableError: tableError.message,
        createTableSQL: `
-- Run this SQL in Supabase SQL editor to create the table:
CREATE TABLE IF NOT EXISTS public.squidgy_agent_business_setup (
  firm_id UUID,
  firm_user_id UUID NOT NULL,
  agent_id VARCHAR(255) NOT NULL,
  agent_name VARCHAR(255) NOT NULL,
  setup_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (firm_user_id, agent_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_public_agent_setup_firm_user 
ON public.squidgy_agent_business_setup(firm_user_id);

CREATE INDEX IF NOT EXISTS idx_public_agent_setup_agent 
ON public.squidgy_agent_business_setup(agent_id);

CREATE INDEX IF NOT EXISTS idx_public_agent_setup_json 
ON public.squidgy_agent_business_setup USING GIN(setup_json);

-- Grant permissions
GRANT ALL ON public.squidgy_agent_business_setup TO anon, authenticated;
        `
      });
    }

    console.log('✅ Table exists, proceeding with insert...');

    // Upsert using the correct profile user_id with proper conflict resolution
    const { data, error } = await supabase
      .from('squidgy_agent_business_setup')
      .upsert({
        firm_id: null,
        firm_user_id: testUserId,
        agent_id: 'SOLAgent',
        agent_name: 'Solar Sales Specialist',
        setup_type: 'SolarSetup',
        setup_json: DEFAULT_SOLAR_CONFIG,
        is_enabled: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'firm_user_id,agent_id,setup_type',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('❌ Database insert failed:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message,
        details: error 
      });
    }

    console.log('✅ Database insert successful:', data);

    // Get count of all records
    const { data: allRecords, error: countError } = await supabase
      .from('squidgy_agent_business_setup')
      .select('*');

    if (countError) {
      console.error('❌ Count query failed:', countError);
    }

    const totalCount = allRecords?.length || 0;
    console.log(`📊 Total records in table: ${totalCount}`);

    // Get records for this test user
    const { data: userRecords, error: userError } = await supabase
      .from('squidgy_agent_business_setup')
      .select('*')
      .eq('firm_user_id', testUserId);

    if (userError) {
      console.error('❌ User records query failed:', userError);
    }

    const userCount = userRecords?.length || 0;
    console.log(`👤 Records for test user: ${userCount}`);

    return res.status(200).json({
      success: true,
      message: 'Solar config saved successfully!',
      insertedRecord: data,
      totalRecords: totalCount,
      userRecords: userCount,
      testUserId
    });

  } catch (error) {
    console.error('❌ API endpoint error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}