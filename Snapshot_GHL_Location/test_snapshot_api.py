#!/usr/bin/env python3
"""
🧪 TEST SNAPSHOT API ACCESS
==========================
Quick test to verify your token has snapshot permissions
"""

import httpx
import asyncio


AGENCY_TOKEN = "pit-c4e9d6af-8956-4a84-9b83-554fb6801a69"
LOCATION_TOKEN = "pit-519ac848-5b7f-4de4-acd2-bde5065493ee"
COMPANY_ID = "lp2p1q27DrdGta1qGDJd"


async def test_token(token: str, token_name: str):
    """Test if token can access snapshot endpoints"""
    
    print(f"\n🔍 Testing {token_name}")
    print("=" * 40)
    print(f"Token: {token[:25]}...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Version": "2021-07-28",
        "Accept": "application/json"
    }
    
    # Test endpoints
    endpoints = [
        {
            "name": "List Snapshots",
            "url": f"https://services.leadconnectorhq.com/snapshots?companyId={COMPANY_ID}",
            "method": "GET"
        },
        {
            "name": "Company Info",
            "url": f"https://services.leadconnectorhq.com/companies/{COMPANY_ID}",
            "method": "GET"
        }
    ]
    
    for endpoint in endpoints:
        print(f"\n📡 Testing: {endpoint['name']}")
        print(f"   URL: {endpoint['url']}")
        
        try:
            async with httpx.AsyncClient() as client:
                if endpoint['method'] == 'GET':
                    response = await client.get(endpoint['url'], headers=headers)
                else:
                    response = await client.post(endpoint['url'], headers=headers)
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print("   ✅ Success!")
            elif response.status_code == 401:
                print("   ❌ Unauthorized - Invalid token")
            elif response.status_code == 403:
                print("   ❌ Forbidden - Token lacks permissions")
            elif response.status_code == 404:
                print("   ❌ Not Found - Endpoint may not exist")
            else:
                print(f"   ❌ Error: {response.text[:100]}...")
                
        except Exception as e:
            print(f"   💥 Exception: {str(e)}")


async def main():
    """Test both tokens"""
    
    print("🧪 SNAPSHOT API ACCESS TEST")
    print("=" * 60)
    
    # Test agency token
    await test_token(AGENCY_TOKEN, "Agency Token")
    
    # Test location token
    await test_token(LOCATION_TOKEN, "Location Token")
    
    print("\n" + "="*60)
    print("💡 RESULTS:")
    print("- If you see 401/403 errors, the token lacks snapshot permissions")
    print("- Agency tokens typically have broader permissions")
    print("- You may need to create a new token with snapshot scopes")
    print("\n📋 To create proper token:")
    print("1. Go to GHL Settings → Private Integrations")
    print("2. Create new integration")
    print("3. Enable snapshot-related scopes")
    print("4. Use the generated token")


if __name__ == "__main__":
    asyncio.run(main())