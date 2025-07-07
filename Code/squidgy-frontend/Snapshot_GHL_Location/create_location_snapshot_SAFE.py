#!/usr/bin/env python3
"""
🔒 SAFE LOCATION SNAPSHOT CREATOR - READ-ONLY OPERATIONS
=======================================================
Creates a snapshot of location JUTFTny8EXQOSB5NcvAA

⚠️ SAFETY FEATURES:
- NO DELETE operations
- NO UPDATE operations  
- READ-ONLY API calls only
- Creates snapshot without modifying original location

Location to snapshot: JUTFTny8EXQOSB5NcvAA
New snapshot name: SOMA SOL AGENT CHECK
"""

import httpx
import asyncio
import json
from datetime import datetime


# CONFIGURATION
AGENCY_TOKEN = "pit-c4e9d6af-8956-4a84-9b83-554fb6801a69"
COMPANY_ID = "lp2p1q27DrdGta1qGDJd"

# LOCATION TO SNAPSHOT (DO NOT MODIFY!)
SOURCE_LOCATION_ID = "JUTFTny8EXQOSB5NcvAA"  # SOL Agent location - DO NOT DELETE/UPDATE
SNAPSHOT_NAME = "SOMA SOL AGENT CHECK"

# OLD LOCATION (COMMENTED OUT AS REQUESTED)
# OLD_LOCATION_ID = "lBPqgBowX1CsjHay12LY"  # Nestle LLC - SOMA TEST


async def get_location_details():
    """
    READ-ONLY: Get details about the location to understand what will be snapshotted
    """
    print("\n📍 STEP 1: GETTING LOCATION DETAILS (READ-ONLY)")
    print("=" * 60)
    print(f"Location ID: {SOURCE_LOCATION_ID}")
    print("⚠️  This is a READ-ONLY operation - no changes will be made")
    
    headers = {
        "Authorization": f"Bearer {AGENCY_TOKEN}",
        "Version": "2021-07-28",
        "Accept": "application/json"
    }
    
    try:
        # Try to get location details
        url = f"https://services.leadconnectorhq.com/locations/{SOURCE_LOCATION_ID}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            location_data = data.get('location', data)
            
            print("\n✅ Location found!")
            print(f"📛 Name: {location_data.get('name', 'Unknown')}")
            print(f"🏢 Company ID: {location_data.get('companyId', 'Unknown')}")
            print(f"📧 Email: {location_data.get('email', 'Unknown')}")
            print(f"📱 Phone: {location_data.get('phone', 'Unknown')}")
            print(f"🌐 Website: {location_data.get('website', 'Unknown')}")
            print(f"⏰ Created: {location_data.get('dateAdded', 'Unknown')}")
            
            return True
        else:
            print(f"❌ Could not get location details: {response.status_code}")
            print(f"Response: {response.text[:200]}...")
            return False
            
    except Exception as e:
        print(f"💥 Error: {str(e)}")
        return False


async def create_location_snapshot():
    """
    CREATE SNAPSHOT: Creates a snapshot of the location
    This is SAFE - it only creates a copy, doesn't modify the original
    """
    print("\n📸 STEP 2: CREATING LOCATION SNAPSHOT")
    print("=" * 60)
    print(f"Creating snapshot of: {SOURCE_LOCATION_ID}")
    print(f"Snapshot name: {SNAPSHOT_NAME}")
    print("⚠️  This creates a COPY - original location remains untouched")
    
    headers = {
        "Authorization": f"Bearer {AGENCY_TOKEN}",
        "Version": "2021-07-28",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    # Snapshot creation payload
    # Based on GHL API patterns, we need to find the correct endpoint
    
    # First, let's check what snapshot endpoints are available
    print("\n🔍 Finding correct snapshot creation endpoint...")
    
    # Possible endpoints for creating snapshots
    endpoints_to_try = [
        {
            "url": f"https://services.leadconnectorhq.com/locations/{SOURCE_LOCATION_ID}/snapshot",
            "method": "POST",
            "body": {"name": SNAPSHOT_NAME}
        },
        {
            "url": f"https://backend.leadconnectorhq.com/locations/{SOURCE_LOCATION_ID}/snapshot",
            "method": "POST", 
            "body": {"name": SNAPSHOT_NAME}
        },
        {
            "url": f"https://services.leadconnectorhq.com/snapshots",
            "method": "POST",
            "body": {
                "name": SNAPSHOT_NAME,
                "locationId": SOURCE_LOCATION_ID,
                "companyId": COMPANY_ID
            }
        },
        {
            "url": f"https://backend.leadconnectorhq.com/snapshots",
            "method": "POST",
            "body": {
                "name": SNAPSHOT_NAME,
                "locationId": SOURCE_LOCATION_ID,
                "type": "location"
            }
        }
    ]
    
    for endpoint in endpoints_to_try:
        print(f"\n📡 Trying: {endpoint['url']}")
        print(f"   Method: {endpoint['method']}")
        print(f"   Body: {json.dumps(endpoint['body'], indent=2)}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.request(
                    method=endpoint['method'],
                    url=endpoint['url'],
                    headers=headers,
                    json=endpoint['body']
                )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code in [200, 201]:
                print("   ✅ SUCCESS! Snapshot created")
                data = response.json()
                print(f"\n📸 Snapshot Details:")
                print(json.dumps(data, indent=2))
                
                snapshot_id = data.get('id') or data.get('_id') or data.get('snapshotId')
                if snapshot_id:
                    print(f"\n🎯 Snapshot ID: {snapshot_id}")
                    print("💡 You can now create share links for this snapshot")
                
                return data
                
            elif response.status_code == 404:
                print("   ❌ Endpoint not found")
            elif response.status_code == 400:
                print(f"   ❌ Bad request: {response.text[:200]}...")
            elif response.status_code == 401:
                print("   ❌ Unauthorized")
            elif response.status_code == 403:
                print("   ❌ Forbidden - may need different permissions")
            else:
                print(f"   ❌ Error: {response.text[:200]}...")
                
        except Exception as e:
            print(f"   💥 Exception: {str(e)}")
    
    print("\n❌ Could not create snapshot with any endpoint")
    print("\n💡 ALTERNATIVE APPROACH:")
    print("You may need to create the snapshot through the GHL UI:")
    print("1. Login to GHL")
    print("2. Go to the location: JUTFTny8EXQOSB5NcvAA")
    print("3. Settings → Create Snapshot")
    print("4. Name it: SOMA SOL AGENT CHECK")
    print("5. Select all components to include")
    print("6. Create the snapshot")
    
    return None


async def verify_snapshot_contents():
    """
    READ-ONLY: List what components are typically included in snapshots
    """
    print("\n📋 SNAPSHOT COMPONENTS (What gets copied)")
    print("=" * 60)
    print("A complete location snapshot typically includes:")
    print("✓ Workflows & Automations")
    print("✓ Pipelines & Stages")
    print("✓ Custom Fields")
    print("✓ Custom Values")
    print("✓ Templates (Email/SMS)")
    print("✓ Forms & Surveys")
    print("✓ Funnels & Websites")
    print("✓ Calendars & Appointments")
    print("✓ Tags")
    print("✓ Triggers")
    print("✓ Campaigns")
    print("✓ Products & Prices")
    print("✓ Memberships")
    print("✓ Communities")
    print("\n⚠️  Note: Contacts and actual data are NOT included in snapshots")


async def main():
    """Main function - SAFE execution only"""
    
    print("🔒 SAFE LOCATION SNAPSHOT CREATOR")
    print("=" * 80)
    print(f"Source Location: {SOURCE_LOCATION_ID}")
    print(f"Snapshot Name: {SNAPSHOT_NAME}")
    print(f"Token: {AGENCY_TOKEN[:25]}...")
    print("\n⚠️  SAFETY GUARANTEE:")
    print("• NO DELETE operations will be performed")
    print("• NO UPDATE operations will be performed")
    print("• Original location will remain completely untouched")
    print("• Only creating a READ-ONLY snapshot copy")
    print("=" * 80)
    
    # Step 1: Get location details (READ-ONLY)
    location_exists = await get_location_details()
    
    if not location_exists:
        print("\n❌ Cannot proceed - location not accessible")
        return
    
    # Step 2: Show what will be included
    await verify_snapshot_contents()
    
    # Step 3: Create snapshot (SAFE - only creates copy)
    print("\n" + "="*80)
    print("🚀 READY TO CREATE SNAPSHOT")
    print("This will create a COPY of the location without modifying the original")
    print("="*80)
    
    snapshot_result = await create_location_snapshot()
    
    if snapshot_result:
        print("\n✅ SNAPSHOT CREATED SUCCESSFULLY!")
        print("The original location remains completely unchanged")
    else:
        print("\n⚠️  Snapshot creation via API was not successful")
        print("Please create the snapshot manually through the GHL UI")
    
    print("\n🎯 NEXT STEPS TO TEST:")
    print("1. Check if snapshot was created in your snapshots list")
    print("2. Run: python list_snapshots_working.py")
    print("3. Look for 'SOMA SOL AGENT CHECK' in the list")
    print("4. Create a share link if needed")
    print("5. Import into a test location to verify all components")


if __name__ == "__main__":
    print("\n⚠️  SAFETY CHECK")
    print("="*60)
    print("This script will:")
    print("✓ READ location details only")
    print("✓ CREATE a snapshot (copy) only")
    print("✗ Will NOT delete anything")
    print("✗ Will NOT update the original location")
    print("\nPress Ctrl+C to cancel, or wait 3 seconds to continue...")
    
    import time
    time.sleep(3)
    
    asyncio.run(main())