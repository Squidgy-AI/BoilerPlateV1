#!/usr/bin/env python3
"""
🌐 REAL GHL API TESTING
======================
Tests components with actual GHL API calls
⚠️ USE WITH CAUTION - MAKES REAL API CALLS
"""

import httpx
import asyncio
import json
from datetime import datetime

# Real GHL configuration
GHL_CONFIG = {
    "agency_token": "pit-c4e9d6af-8956-4a84-9b83-554fb6801a69",
    "company_id": "lp2p1q27DrdGta1qGDJd",
    "source_location_id": "JUTFTny8EXQOSB5NcvAA",
    "test_location_id": "lBPqgBowX1CsjHay12LY"  # Nestle test location
}

async def test_ghl_api_access():
    """Test actual GHL API access"""
    
    print("🌐 TESTING REAL GHL API ACCESS")
    print("=" * 50)
    print("⚠️  This makes actual API calls to GoHighLevel")
    print("⚠️  Ensure you have proper permissions")
    print("=" * 50)
    
    headers = {
        "Authorization": f"Bearer {GHL_CONFIG['agency_token']}",
        "Version": "2021-07-28",
        "Accept": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        
        # Test 1: Get Source Location Details
        print("\n📍 Test 1: Get Source Location Details")
        try:
            response = await client.get(
                f"https://services.leadconnectorhq.com/locations/{GHL_CONFIG['source_location_id']}",
                headers=headers
            )
            
            if response.status_code == 200:
                location = response.json()
                print("✅ Source location accessible")
                print(f"   Name: {location.get('location', {}).get('name', 'Unknown')}")
                print(f"   ID: {GHL_CONFIG['source_location_id']}")
            else:
                print(f"❌ Cannot access source location: {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                
        except Exception as e:
            print(f"❌ API call failed: {e}")
        
        # Test 2: List Source Location Components
        print("\n🔧 Test 2: List Source Location Components")
        
        # Test workflows
        try:
            response = await client.get(
                "https://services.leadconnectorhq.com/workflows",
                headers=headers,
                params={"locationId": GHL_CONFIG['source_location_id']}
            )
            
            if response.status_code == 200:
                workflows = response.json()
                workflow_count = len(workflows.get('workflows', []))
                print(f"✅ Workflows accessible: {workflow_count} found")
                
                if workflow_count > 0:
                    sample_workflow = workflows['workflows'][0]
                    print(f"   Sample: {sample_workflow.get('name', 'Unnamed')}")
            else:
                print(f"❌ Cannot access workflows: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Workflow API call failed: {e}")
        
        # Test custom fields
        try:
            response = await client.get(
                "https://services.leadconnectorhq.com/custom-fields",
                headers=headers,
                params={"locationId": GHL_CONFIG['source_location_id']}
            )
            
            if response.status_code == 200:
                fields = response.json()
                field_count = len(fields.get('customFields', []))
                print(f"✅ Custom fields accessible: {field_count} found")
            else:
                print(f"❌ Cannot access custom fields: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Custom fields API call failed: {e}")
        
        # Test 3: Test Target Location Access
        print("\n🎯 Test 3: Test Target Location Access")
        try:
            response = await client.get(
                f"https://services.leadconnectorhq.com/locations/{GHL_CONFIG['test_location_id']}",
                headers=headers
            )
            
            if response.status_code == 200:
                location = response.json()
                print("✅ Target location accessible")
                print(f"   Name: {location.get('location', {}).get('name', 'Unknown')}")
                print(f"   ID: {GHL_CONFIG['test_location_id']}")
            else:
                print(f"❌ Cannot access target location: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Target location API call failed: {e}")
        
        # Test 4: Snapshot API Access
        print("\n📸 Test 4: Snapshot API Access")
        try:
            response = await client.get(
                f"https://backend.leadconnectorhq.com/snapshots/{GHL_CONFIG['company_id']}",
                headers=headers
            )
            
            if response.status_code == 200:
                snapshots = response.json()
                snapshot_count = len(snapshots.get('snapshots', []))
                print(f"✅ Snapshots accessible: {snapshot_count} found")
                
                # Look for Solar snapshot
                solar_snapshots = [
                    s for s in snapshots.get('snapshots', [])
                    if 'solar' in s.get('name', '').lower()
                ]
                print(f"   Solar snapshots: {len(solar_snapshots)}")
                
            else:
                print(f"❌ Cannot access snapshots: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Snapshot API call failed: {e}")

    print("\n📊 GHL API Test Summary:")
    print("🔑 Token access: Tested")
    print("📍 Location access: Tested") 
    print("🔧 Component access: Tested")
    print("📸 Snapshot access: Tested")
    print("\n✅ If all tests passed, the cloning system can access GHL APIs")

async def test_safe_clone_simulation():
    """Simulate a clone without making destructive changes"""
    
    print("\n🛡️ SAFE CLONE SIMULATION")
    print("=" * 50)
    print("Testing clone logic without making changes")
    
    from solar_clone_engine import SolarCloneEngine
    from business_data_exclusion import BusinessDataExclusionEngine
    
    # Initialize engines
    clone_engine = SolarCloneEngine(
        agency_token=GHL_CONFIG['agency_token'],
        company_id=GHL_CONFIG['company_id']
    )
    
    exclusion_engine = BusinessDataExclusionEngine()
    
    # Test data cleaning on sample GHL data
    sample_workflow = {
        "name": "Solar Lead Follow-up",
        "id": "workflow_123",
        "locationId": GHL_CONFIG['source_location_id'],
        "actions": [
            {
                "type": "send_email",
                "fromEmail": "sales@realsolarcompany.com",
                "contactIds": ["contact_123", "contact_456"]
            }
        ]
    }
    
    print("\n🧹 Testing data cleaning:")
    cleaned_workflow = clone_engine._clean_workflow_data(sample_workflow)
    
    print(f"✅ Original ID removed: {'id' not in cleaned_workflow}")
    print(f"✅ Location ID removed: {'locationId' not in cleaned_workflow}")
    print(f"✅ Contact IDs cleared: {cleaned_workflow['actions'][0]['contactIds'] == []}")
    print(f"✅ Email sanitized: {cleaned_workflow['actions'][0]['fromEmail'] == 'demo@solar-company.com'}")
    
    print("\n🎭 Testing dummy data generation:")
    from dummy_data_generator import SolarDummyDataGenerator
    generator = SolarDummyDataGenerator(GHL_CONFIG['agency_token'], 'SAFE_TEST_')
    
    demo_contact = generator._generate_single_contact(0)
    print(f"✅ Demo contact created: {demo_contact['firstName']} {demo_contact['lastName']}")
    print(f"✅ Demo email: {demo_contact['email']}")
    print(f"✅ Demo marker: {demo_contact['customFields']['demo_contact']}")
    
    print("\n🔒 Security validation complete!")

if __name__ == "__main__":
    print("🌐 Choose test type:")
    print("1. Real GHL API Access Test")
    print("2. Safe Clone Simulation")
    print("3. Both")
    
    choice = input("Enter choice (1/2/3): ").strip()
    
    if choice in ['1', '3']:
        asyncio.run(test_ghl_api_access())
    
    if choice in ['2', '3']:
        asyncio.run(test_safe_clone_simulation())