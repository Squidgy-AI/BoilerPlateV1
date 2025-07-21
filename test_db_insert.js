// Simple test to verify database insert is working
// Run this in browser console to test

async function testDatabaseInsert() {
  console.log('🧪 Testing database insert...');
  
  // Import the supabase client
  const { supabase } = await import('./src/lib/supabase.js');
  
  // Test data matching the 13 solar config fields
  const testConfig = {
    installationPricePerWatt: 2.50,
    dealerFeePercent: 0.20,
    brokerFee: 500,
    cashPurchaseEnabled: true,
    financedPurchaseEnabled: true,
    financingApr: 0.06,
    financingTermMonths: 240,
    energyPricePerKwh: 0.18,
    yearlyElectricCostIncreasePercent: 0.05,
    installationLifespanYears: 25,
    typicalPanelCount: 45,
    maxRoofSegments: 4,
    solarIncentivePercent: 0.30
  };

  try {
    // Get current auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ No authenticated user');
      return;
    }

    // Get the profile to get the correct user_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      console.error('❌ Failed to get user profile');
      return;
    }

    console.log('✅ User authenticated, profile user_id:', profile.user_id);

    // Try to upsert the record using profile.user_id with proper conflict resolution
    const { data, error } = await supabase
      .from('squidgy_agent_business_setup')
      .upsert({
        firm_id: null, // Set as null
        firm_user_id: profile.user_id, // user_id from profiles table
        agent_id: 'SOLAgent', // String from agents.ts
        agent_name: 'Solar Sales Specialist', // Name from agents.ts
        setup_type: 'SolarSetup', // Required field
        setup_json: testConfig, // The 13 field responses as JSON
        is_enabled: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'firm_user_id,agent_id,setup_type',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('❌ Insert failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Insert successful:', data);
    }

    // Count total records in table
    const { data: countData, error: countError } = await supabase
      .from('squidgy_agent_business_setup')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Count failed:', countError);
    } else {
      console.log('📊 Total records in table:', countData);
    }

    // Get all records for this user
    const { data: userRecords, error: userError } = await supabase
      .from('squidgy_agent_business_setup')
      .select('*')
      .eq('firm_user_id', profile.user_id);

    if (userError) {
      console.error('❌ User records fetch failed:', userError);
    } else {
      console.log('👤 User records:', userRecords);
      console.log(`✅ User has ${userRecords?.length || 0} solar config records`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Acceptance criteria: Check if record count > 0
async function checkAcceptanceCriteria() {
  console.log('🎯 Checking acceptance criteria...');
  
  const { supabase } = await import('./src/lib/supabase.js');
  
  const { data, error } = await supabase
    .from('squidgy_agent_business_setup')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('❌ Acceptance criteria failed - could not query table:', error);
    return false;
  }

  const count = data?.length || 0;
  console.log(`📊 Record count: ${count}`);
  
  if (count > 0) {
    console.log('✅ ACCEPTANCE CRITERIA PASSED - Record count > 0');
    return true;
  } else {
    console.log('❌ ACCEPTANCE CRITERIA FAILED - No records found');
    return false;
  }
}

// Run the test
console.log('Run testDatabaseInsert() to test the insert');
console.log('Run checkAcceptanceCriteria() to verify records exist');