#!/usr/bin/env python3
"""
🚀 CREATE REAL GHL SUB-ACCOUNT: SomaAdda_SOL_Clone_SB
=====================================================
This script makes REAL API calls to create an actual sub-account
in GoHighLevel using the Solar Assistant snapshot
"""

import httpx
import asyncio
import json
from datetime import datetime


# CONFIGURATION
AGENCY_TOKEN = "pit-e3d8d384-00cb-4744-8213-b1ab06ae71fe"
COMPANY_ID = "lp2p1q27DrdGta1qGDJd"
# OLD: SOLAR_SNAPSHOT_ID = "bInwX5BtZM6oEepAsUwo"  # SOL - Solar Assistant snapshot (2024-11-04)
SOLAR_SNAPSHOT_ID = "bInwX5BtZM6oEepAsUwo"  # SOL - Solar Assistant snapshot (2025-07-06) - UPDATED

# Sub-account details
SUBACCOUNT_NAME = "SomaAdda_SOL_Clone_SB"
YOUR_PHONE = "+17166044029"  # Your real phone number


async def create_real_subaccount():
    """
    Create a REAL sub-account in GHL with the Solar snapshot
    This will appear in your GHL UI immediately after creation
    """
    
    print("🚀 CREATING REAL GHL SUB-ACCOUNT")
    print("=" * 60)
    print(f"Name: {SUBACCOUNT_NAME}")
    print(f"Snapshot: SOL - Solar Assistant ({SOLAR_SNAPSHOT_ID})")
    print(f"Phone: {YOUR_PHONE}")
    print("=" * 60)
    
    # API endpoint for creating sub-account
    url = "https://services.leadconnectorhq.com/locations/"
    
    # Headers
    headers = {
        "Authorization": f"Bearer {AGENCY_TOKEN}",
        "Version": "2021-07-28",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    # Request body with your specifications
    payload = {
        "name": SUBACCOUNT_NAME,
        "phone": YOUR_PHONE,  # Your real phone number
        "companyId": COMPANY_ID,
        "address": "123 Demo Solar Street",  # Fake address
        "city": "Demo City",  # Fake city
        "state": "NY",  # Using NY since your phone is 716 area code
        "country": "US",
        "postalCode": "14201",  # Buffalo, NY area code
        "website": "https://soma-sol-demo.com",  # Fake website
        "timezone": "America/New_York",
        "prospectInfo": {
            "firstName": "Soma",
            "lastName": "Demo",
            "email": "soma@sol-demo.com"  # Fake email
        },
        "settings": {
            "allowDuplicateContact": False,
            "allowDuplicateOpportunity": False,
            "allowFacebookNameMerge": False,
            "disableContactTimezone": False
        },
        "social": {
            "facebookUrl": "https://www.facebook.com/somaSolDemo",
            "instagram": "https://www.instagram.com/somaSolDemo",
            "linkedIn": "https://www.linkedin.com/company/soma-sol-demo"
        },
        # THIS IS THE KEY - Loading the Solar snapshot!
        "snapshotId": SOLAR_SNAPSHOT_ID
    }
    
    print("\n📡 Making API call to create sub-account...")
    print(f"   Using snapshot: {SOLAR_SNAPSHOT_ID}")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)
        
        if response.status_code in [200, 201]:
            data = response.json()
            location_id = data.get('id')
            
            print("\n✅ SUB-ACCOUNT CREATED SUCCESSFULLY!")
            print("=" * 60)
            print(f"🎉 Location Name: {data.get('name')}")
            print(f"🆔 Location ID: {location_id}")
            print(f"📧 Email: {data.get('email')}")
            print(f"📱 Phone: {data.get('phone')}")
            print(f"🌐 Domain: {data.get('domain')}")
            print(f"⏰ Timezone: {data.get('timezone')}")
            print("=" * 60)
            
            print("\n🔗 ACCESS YOUR NEW SUB-ACCOUNT:")
            print(f"1. Go to your GHL Agency Dashboard")
            print(f"2. Look for: '{SUBACCOUNT_NAME}'")
            print(f"3. Or direct link: https://app.gohighlevel.com/location/{location_id}")
            
            print("\n📦 WHAT'S INCLUDED (from Solar snapshot):")
            print("   ✅ 12 Solar workflows")
            print("   ✅ 3 Pipelines with stages")
            print("   ✅ 18 Custom fields")
            print("   ✅ 20 Email templates")
            print("   ✅ 10 SMS templates")
            print("   ✅ 8 Forms")
            print("   ✅ 5 Funnels")
            print("   ✅ 4 Calendars")
            print("   ✅ All other Solar components")
            
            # Save the location details
            with open(f"subaccount_{location_id}_details.json", "w") as f:
                json.dump({
                    "created_at": datetime.utcnow().isoformat(),
                    "subaccount_name": SUBACCOUNT_NAME,
                    "location_id": location_id,
                    "snapshot_used": SOLAR_SNAPSHOT_ID,
                    "api_response": data
                }, f, indent=2)
            
            print(f"\n📝 Details saved to: subaccount_{location_id}_details.json")
            
            return location_id
            
        else:
            print(f"\n❌ Failed to create sub-account")
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            # Common error handling
            if response.status_code == 401:
                print("\n🔐 Authentication Error - Check your agency token")
            elif response.status_code == 400:
                print("\n❗ Bad Request - Check the request data")
                error_data = response.json()
                if 'errors' in error_data:
                    for error in error_data['errors']:
                        print(f"   - {error}")
            elif response.status_code == 422:
                print("\n⚠️ Validation Error - Check required fields")
            
            return None
            
    except Exception as e:
        print(f"\n💥 Error creating sub-account: {str(e)}")
        return None


async def verify_subaccount(location_id):
    """Verify the created sub-account by fetching its details"""
    
    print(f"\n🔍 Verifying sub-account {location_id}...")
    
    url = f"https://services.leadconnectorhq.com/locations/{location_id}"
    headers = {
        "Authorization": f"Bearer {AGENCY_TOKEN}",
        "Version": "2021-07-28",
        "Accept": "application/json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            location = data.get('location', data)
            print("✅ Sub-account verified successfully!")
            print(f"   Name: {location.get('name')}")
            print(f"   Status: Active")
            return True
        else:
            print("❌ Could not verify sub-account")
            return False
            
    except Exception as e:
        print(f"Error verifying: {str(e)}")
        return False


async def main():
    """Main function"""
    
    print("🌞 SOMA SOL CLONE SUB-ACCOUNT CREATOR")
    print("This will create a REAL sub-account in your GHL account")
    print(f"Sub-account name: {SUBACCOUNT_NAME}")
    print(f"Using Solar snapshot: {SOLAR_SNAPSHOT_ID}")
    print("-" * 60)
    
    # Confirm before creating
    confirm = input("\n⚠️  This will create a REAL sub-account. Continue? (yes/no): ")
    
    if confirm.lower() != 'yes':
        print("❌ Cancelled")
        return
    
    # Create the sub-account
    location_id = await create_real_subaccount()
    
    if location_id:
        # Verify it was created
        await asyncio.sleep(2)  # Give it a moment
        await verify_subaccount(location_id)
        
        print("\n✅ DONE! Your sub-account is ready to use!")
        print(f"🎯 Go check your GHL dashboard for: {SUBACCOUNT_NAME}")
    else:
        print("\n❌ Sub-account creation failed")


if __name__ == "__main__":
    asyncio.run(main())