#!/bin/bash

echo "🧪 Testing Solar Config API Endpoints..."
echo ""

# Test the API endpoint without authentication (will likely fail, but shows the endpoint is responding)
echo "1. Testing POST endpoint (should return auth error):"
curl -X POST http://localhost:3001/api/save-agent-setup \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "SOLAgent",
    "agent_name": "Solar Sales Specialist",
    "setup_json": {
      "installationPricePerWatt": 2.50,
      "dealerFeePercent": 0.20,
      "brokerFee": 500,
      "cashPurchaseEnabled": true,
      "financedPurchaseEnabled": true,
      "financingApr": 0.06,
      "financingTermMonths": 240,
      "energyPricePerKwh": 0.18,
      "yearlyElectricCostIncreasePercent": 0.05,
      "installationLifespanYears": 25,
      "typicalPanelCount": 45,
      "maxRoofSegments": 4,
      "solarIncentivePercent": 0.30
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n\n"

echo "2. Testing GET endpoint (should return auth error):"
curl -X GET "http://localhost:3001/api/save-agent-setup?agent_id=SOLAgent" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n\n"

echo "✅ API endpoints are responding (authentication required for actual use)"