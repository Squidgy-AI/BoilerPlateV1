#!/usr/bin/env python3
"""
Test token to determine if it's agency or location level
"""

import httpx
import asyncio
import json

# Token to test
TOKEN = "pit-e3d8d384-00cb-4744-8213-b1ab06ae71fe"  # The agency token you mentioned

async def test_token():
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Version": "2021-07-28",
        "Accept": "application/json"
    }
    
    print("🔍 TESTING TOKEN TYPE")
    print("=" * 50)
    print(f"Token: {TOKEN[:20]}...")
    print()
    
    async with httpx.AsyncClient() as client:
        # Test 1: Try to get user info (agency level)
        print("1️⃣ Testing /users/me endpoint...")
        try:
            response = await client.get(
                "https://services.leadconnectorhq.com/users/me",
                headers=headers
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print("✅ Success! Token appears to be valid")
                print(f"User Type: {data.get('type', 'Unknown')}")
                print(f"Email: {data.get('email', 'Unknown')}")
                print(f"Company ID: {data.get('companyId', 'Unknown')}")
                print(json.dumps(data, indent=2))
            else:
                print(f"❌ Failed: {response.text}")
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            
        print("\n" + "-"*50 + "\n")
        
        # Test 2: Try to list users (agency level operation)
        print("2️⃣ Testing /users endpoint (list users)...")
        try:
            response = await client.get(
                f"https://services.leadconnectorhq.com/users/?companyId=ve9EPM428h8vShlRW1KT",
                headers=headers
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print("✅ Can list users - This is an AGENCY token!")
                print(f"Total users found: {len(data.get('users', []))}")
            else:
                print(f"❌ Cannot list users: {response.text}")
                print("This might be a location-level token")
        except Exception as e:
            print(f"❌ Error: {str(e)}")

asyncio.run(test_token())