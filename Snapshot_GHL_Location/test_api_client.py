#!/usr/bin/env python3
"""
🧪 Solar Clone API Client Test
=============================
Tests the API endpoints when server is running
"""

import httpx
import asyncio
import json
from datetime import datetime

API_BASE = "http://localhost:8000"

async def test_api_client():
    """Test the Solar Clone API endpoints"""
    
    print("🧪 Testing Solar Clone API Client")
    print("=" * 50)
    
    async with httpx.AsyncClient() as client:
        
        # Test 1: Health Check
        print("\n🏥 Test 1: Health Check")
        try:
            response = await client.get(f"{API_BASE}/api/ghl/solar-clone-health")
            if response.status_code == 200:
                health = response.json()
                print(f"✅ Server healthy: {health['status']}")
                print(f"   Service: {health['service']}")
                print(f"   Active clones: {health['statistics']['active_clones']}")
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return
        except Exception as e:
            print(f"❌ Cannot connect to server: {e}")
            print("💡 Make sure to run: python run_api_server.py")
            return
        
        # Test 2: Create Clone
        print("\n🔧 Test 2: Create Clone")
        clone_request = {
            "source_location_id": "JUTFTny8EXQOSB5NcvAA",
            "target_location_name": f"API Test {datetime.now().strftime('%H:%M:%S')}",
            "target_company_id": "lp2p1q27DrdGta1qGDJd",
            "include_components": [
                "workflows", "pipelines", "custom_fields", "email_templates"
            ],
            "add_dummy_data": True,
            "notification_email": "test@demo-solar-company.com"
        }
        
        try:
            response = await client.post(
                f"{API_BASE}/api/ghl/solar-clone",
                json=clone_request
            )
            
            if response.status_code == 200:
                clone_data = response.json()
                clone_id = clone_data['clone_id']
                print(f"✅ Clone started successfully")
                print(f"   Clone ID: {clone_id}")
                print(f"   Status: {clone_data['status']}")
                print(f"   Progress: {clone_data['progress_percentage']}%")
                
                # Test 3: Check Clone Status
                print("\n📊 Test 3: Check Clone Status")
                await asyncio.sleep(2)  # Wait a bit
                
                status_response = await client.get(
                    f"{API_BASE}/api/ghl/solar-clone/{clone_id}"
                )
                
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    print(f"✅ Status retrieved successfully")
                    print(f"   Status: {status_data['status']}")
                    print(f"   Progress: {status_data['progress_percentage']}%")
                    print(f"   Components completed: {status_data['total_components_completed']}")
                    print(f"   Items cloned: {status_data['total_items_cloned']}")
                    print(f"   Data exclusion confirmed: {status_data['data_exclusion_confirmed']}")
                
                # Test 4: List Clones
                print("\n📋 Test 4: List Clones")
                list_response = await client.get(
                    f"{API_BASE}/api/ghl/solar-clones",
                    params={"company_id": "lp2p1q27DrdGta1qGDJd"}
                )
                
                if list_response.status_code == 200:
                    list_data = list_response.json()
                    print(f"✅ Clone list retrieved")
                    print(f"   Total clones: {list_data['total_count']}")
                    print(f"   Current page items: {len(list_data['items'])}")
                    
                    if list_data['items']:
                        latest = list_data['items'][0]
                        print(f"   Latest clone: {latest['target_location_name']}")
                
            else:
                print(f"❌ Clone creation failed: {response.status_code}")
                print(f"   Error: {response.text}")
                
        except Exception as e:
            print(f"❌ API test failed: {e}")
    
    print("\n🎉 API Client Test Complete!")

if __name__ == "__main__":
    asyncio.run(test_api_client())