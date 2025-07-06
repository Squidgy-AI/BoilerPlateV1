#!/usr/bin/env python3
"""
Check location info for the given token
"""

import httpx
import asyncio
import json

# Your location access token
TOKEN = "pit-519ac848-5b7f-4de4-acd2-bde5065493ee"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Version": "2021-07-28",
    "Accept": "application/json"
}

async def check_location_info():
    print("🔍 CHECKING LOCATION INFO FOR TOKEN")
    print("=" * 50)
    print(f"Token: {TOKEN[:25]}...")
    
    async with httpx.AsyncClient() as client:
        # Try to get location info
        print("\n1️⃣ Getting location details...")
        location_id = "lBPqgBowX1CsjHay12LY"
        
        try:
            response = await client.get(
                f"https://services.leadconnectorhq.com/locations/{location_id}",
                headers=headers
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print("✅ Found location info!")
                print(f"\nLocation Details:")
                print(f"  ID: {data.get('id')}")
                print(f"  Name: {data.get('name')}")
                print(f"  Company ID: {data.get('companyId')}")
                print(f"  Email: {data.get('email')}")
                print(f"  Phone: {data.get('phone')}")
                
                # This is the company ID we need!
                company_id = data.get('companyId')
                print(f"\n🎯 USE THIS COMPANY ID: {company_id}")
                
                # Save for reference
                with open('location_info.json', 'w') as f:
                    json.dump(data, f, indent=2)
                print(f"\n📁 Full data saved to: location_info.json")
            else:
                print(f"❌ Failed: {response.text}")
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            
        print("\n" + "-"*50)
        
        # Try to list users in this location
        print("\n2️⃣ Listing existing users...")
        try:
            response = await client.get(
                f"https://services.leadconnectorhq.com/users/?locationId={location_id}",
                headers=headers
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                users = data.get('users', [])
                print(f"✅ Found {len(users)} users in this location")
                
                for idx, user in enumerate(users[:3]):  # Show first 3
                    print(f"\nUser {idx + 1}:")
                    print(f"  Name: {user.get('firstName')} {user.get('lastName')}")
                    print(f"  Email: {user.get('email')}")
                    print(f"  Role: {user.get('role')}")
                    print(f"  ID: {user.get('id')}")
            else:
                print(f"❌ Failed: {response.text}")
        except Exception as e:
            print(f"❌ Error: {str(e)}")

asyncio.run(check_location_info())