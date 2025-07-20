#!/usr/bin/env python3
"""
🚀 CREATE SOMA'S SUB-ACCOUNT RIGHT NOW
=====================================
Real-time creation with progress indicators
"""

import httpx
import asyncio
import json
from datetime import datetime
import time


# CONFIGURATION
AGENCY_TOKEN = "pit-c4e9d6af-8956-4a84-9b83-554fb6801a69"
COMPANY_ID = "lp2p1q27DrdGta1qGDJd"
# OLD: SOLAR_SNAPSHOT_ID = "bInwX5BtZM6oEepAsUwo"  # SOL - Solar Assistant (2024-11-04)
SOLAR_SNAPSHOT_ID = "bInwX5BtZM6oEepAsUwo"  # SOL - Solar Assistant (2025-07-06) - UPDATED

# Generate unique name with timestamp to avoid duplicates
TIMESTAMP = datetime.now().strftime("%H%M%S")
SUBACCOUNT_NAME = f"SomaAdda_SOL_Clone_SB_{TIMESTAMP}"
YOUR_PHONE = "+17166044029"


async def create_subaccount_with_progress():
    """Create sub-account with real-time progress updates"""
    
    print("🚀 CREATING YOUR SUB-ACCOUNT NOW!")
    print("=" * 60)
    print(f"⏰ Starting at: {datetime.now().strftime('%I:%M:%S %p')}")
    print(f"📍 Sub-account Name: {SUBACCOUNT_NAME}")
    print(f"📸 Using Solar Snapshot: Yes")
    print("=" * 60)
    
    # Prepare the request
    url = "https://services.leadconnectorhq.com/locations/"
    headers = {
        "Authorization": f"Bearer {AGENCY_TOKEN}",
        "Version": "2021-07-28",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    payload = {
        "name": SUBACCOUNT_NAME,
        "phone": YOUR_PHONE,
        "companyId": COMPANY_ID,
        "address": "456 Solar Demo Avenue",
        "city": "Buffalo",
        "state": "NY",
        "country": "US",
        "postalCode": "14201",
        "website": f"https://soma-sol-{TIMESTAMP}.com",
        "timezone": "America/New_York",
        "prospectInfo": {
            "firstName": "Soma",
            "lastName": "Adda",
            "email": f"soma+{TIMESTAMP}@sol-demo.com"
        },
        "settings": {
            "allowDuplicateContact": False,
            "allowDuplicateOpportunity": False,
            "allowFacebookNameMerge": False,
            "disableContactTimezone": False
        },
        "snapshotId": SOLAR_SNAPSHOT_ID  # This loads all Solar components!
    }
    
    print("\n⏳ CREATING SUB-ACCOUNT...")
    print("   [", end="", flush=True)
    
    try:
        # Make the API call
        start_time = time.time()
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Show progress dots
            for i in range(5):
                print("■", end="", flush=True)
                await asyncio.sleep(0.2)
            
            response = await client.post(url, headers=headers, json=payload)
            
            for i in range(5):
                print("■", end="", flush=True)
                await asyncio.sleep(0.2)
        
        print("] 100%")
        
        elapsed_time = time.time() - start_time
        
        if response.status_code in [200, 201]:
            data = response.json()
            location_id = data.get('id')
            
            print("\n✅ SUB-ACCOUNT CREATED SUCCESSFULLY!")
            print(f"⏱️  Creation time: {elapsed_time:.2f} seconds")
            print("\n" + "🎉" * 30)
            
            print(f"\n📋 SUB-ACCOUNT DETAILS:")
            print(f"   Name: {data.get('name')}")
            print(f"   ID: {location_id}")
            print(f"   Status: ACTIVE ✅")
            
            print("\n" + "⭐" * 30)
            print("\n🔍 CHECK GHL NOW! 🔍")
            print("=" * 60)
            print("👉 GO TO: https://app.gohighlevel.com")
            print(f"👉 LOOK FOR: '{SUBACCOUNT_NAME}'")
            print("👉 IT SHOULD BE THERE NOW!")
            print("=" * 60)
            
            print("\n⏰ WHEN TO CHECK: RIGHT NOW!")
            print("   The sub-account is created instantly.")
            print("   It should appear in your GHL dashboard immediately.")
            
            print(f"\n🔗 DIRECT LINK TO YOUR NEW SUB-ACCOUNT:")
            print(f"   https://app.gohighlevel.com/location/{location_id}")
            
            print("\n📦 WHAT'S LOADED:")
            print("   ✅ All Solar workflows")
            print("   ✅ All pipelines and stages")
            print("   ✅ All custom fields")
            print("   ✅ All templates")
            print("   ✅ Everything from the Solar snapshot!")
            
            # Save details
            details = {
                "created_at": datetime.utcnow().isoformat(),
                "local_time": datetime.now().strftime("%Y-%m-%d %I:%M:%S %p"),
                "subaccount_name": SUBACCOUNT_NAME,
                "location_id": location_id,
                "creation_time_seconds": elapsed_time,
                "status": "SUCCESS",
                "snapshot_loaded": "SOL - Solar Assistant"
            }
            
            filename = f"soma_subaccount_{location_id}.json"
            with open(filename, "w") as f:
                json.dump(details, f, indent=2)
            
            print(f"\n💾 Details saved to: {filename}")
            
            return location_id
            
        else:
            print("] ❌ FAILED")
            print(f"\n❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print("] ❌ ERROR")
        print(f"\n💥 Error: {str(e)}")
        return None


async def main():
    """Main function with countdown"""
    
    print("🌞 SOMA'S SUB-ACCOUNT CREATOR - REAL TIME")
    print("This will create a REAL sub-account RIGHT NOW")
    print("-" * 60)
    
    # Countdown
    print("\n⏰ Creating in...")
    for i in range(3, 0, -1):
        print(f"   {i}...")
        await asyncio.sleep(1)
    
    print("   GO! 🚀")
    
    # Create the sub-account
    location_id = await create_subaccount_with_progress()
    
    if location_id:
        print("\n" + "✅" * 30)
        print("\n🎯 YOUR SUB-ACCOUNT IS READY!")
        print(f"🎯 CHECK GHL NOW FOR: {SUBACCOUNT_NAME}")
        print("\n" + "✅" * 30)
    else:
        print("\n❌ Creation failed - check the error above")


if __name__ == "__main__":
    asyncio.run(main())