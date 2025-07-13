#!/usr/bin/env python3
"""
Find the correct company/location info for the agency token
"""

import httpx
import asyncio
import json

# Your agency token
AGENCY_TOKEN = "pit-c4e9d6af-8956-4a84-9b83-554fb6801a69"

headers = {
    "Authorization": f"Bearer {AGENCY_TOKEN}",
    "Version": "2021-07-28",
    "Accept": "application/json"
}

async def find_company_info():
    print("🔍 FINDING COMPANY/LOCATION INFO FOR TOKEN")
    print("=" * 50)
    
    async with httpx.AsyncClient() as client:
        # Try to get locations accessible by this token
        print("\n1️⃣ Trying to get locations...")
        try:
            response = await client.get(
                "https://services.leadconnectorhq.com/locations/",
                headers=headers
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print("✅ Found locations!")
                locations = data.get('locations', [])
                print(f"Total locations: {len(locations)}")
                
                for idx, loc in enumerate(locations[:5]):  # Show first 5
                    print(f"\nLocation {idx + 1}:")
                    print(f"  ID: {loc.get('id')}")
                    print(f"  Name: {loc.get('name')}")
                    print(f"  Company ID: {loc.get('companyId')}")
                    
                # Save for reference
                with open('token_locations.json', 'w') as f:
                    json.dump(data, f, indent=2)
                print(f"\n📁 Full data saved to: token_locations.json")
            else:
                print(f"❌ Failed: {response.text}")
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            
        print("\n" + "-"*50)
        
        # Try to get company info directly
        print("\n2️⃣ Trying to get company info...")
        try:
            response = await client.get(
                "https://services.leadconnectorhq.com/companies/",
                headers=headers
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print("✅ Found company info!")
                print(json.dumps(data, indent=2))
            else:
                print(f"❌ Failed: {response.text}")
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            
        print("\n" + "-"*50)
        
        # Try OAuth scopes endpoint
        print("\n3️⃣ Checking OAuth scopes...")
        try:
            response = await client.get(
                "https://services.leadconnectorhq.com/oauth/installedLocations",
                headers=headers
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print("✅ Found OAuth installation info!")
                print(f"Installed locations: {len(data.get('locations', []))}")
                
                for loc in data.get('locations', [])[:3]:
                    print(f"\nLocation:")
                    print(f"  ID: {loc.get('_id')}")
                    print(f"  Company ID: {loc.get('companyId')}")
                    print(f"  Approved: {loc.get('isApproved')}")
            else:
                print(f"❌ Failed: {response.text}")
        except Exception as e:
            print(f"❌ Error: {str(e)}")

asyncio.run(find_company_info())