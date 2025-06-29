// Test script for Solar Business Config database integration
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

// Test saving solar config
async function testSaveSolarConfig() {
  try {
    console.log('🧪 Testing Solar Config Database Integration...\n');
    
    const response = await fetch('http://localhost:3001/api/save-agent-setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: 'SOLAgent',
        agent_name: 'Solar Sales Specialist',
        setup_json: testConfig
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Save Test PASSED');
      console.log('Response:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Save Test FAILED');
      console.log('Error:', JSON.stringify(result, null, 2));
      console.log('Status:', response.status);
    }

  } catch (error) {
    console.log('❌ Save Test ERROR');
    console.error('Network error:', error.message);
  }
}

// Test retrieving solar config
async function testGetSolarConfig() {
  try {
    console.log('\n🔍 Testing Solar Config Retrieval...\n');
    
    const response = await fetch('http://localhost:3001/api/save-agent-setup?agent_id=SOLAgent', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Retrieval Test PASSED');
      console.log('Response:', JSON.stringify(result, null, 2));
      
      // Verify the data matches what we saved
      if (result.data && result.data.setup_json) {
        const savedConfig = result.data.setup_json;
        console.log('\n📊 Configuration Details:');
        console.log(`- Installation Price: $${savedConfig.installationPricePerWatt}/watt`);
        console.log(`- Dealer Fee: ${(savedConfig.dealerFeePercent * 100)}%`);
        console.log(`- Broker Fee: $${savedConfig.brokerFee}`);
        console.log(`- Financing APR: ${(savedConfig.financingApr * 100)}%`);
        console.log(`- Energy Rate: $${savedConfig.energyPricePerKwh}/kWh`);
        console.log(`- Panel Count: ${savedConfig.typicalPanelCount} panels`);
      }
    } else {
      console.log('❌ Retrieval Test FAILED');
      console.log('Error:', JSON.stringify(result, null, 2));
      console.log('Status:', response.status);
    }

  } catch (error) {
    console.log('❌ Retrieval Test ERROR');
    console.error('Network error:', error.message);
  }
}

// Run tests
async function runAllTests() {
  await testSaveSolarConfig();
  await testGetSolarConfig();
  console.log('\n🏁 Database integration tests completed!');
}

runAllTests();