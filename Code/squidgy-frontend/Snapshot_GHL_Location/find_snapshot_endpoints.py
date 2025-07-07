#!/usr/bin/env python3
"""
🔍 FIND CORRECT SNAPSHOT ENDPOINTS
=================================
Discovers the correct API endpoints for snapshots
"""

import httpx
import asyncio
import json


AGENCY_TOKEN = "pit-c4e9d6af-8956-4a84-9b83-554fb6801a69"
COMPANY_ID = "lp2p1q27DrdGta1qGDJd"
LOCATION_ID = "lBPqgBowX1CsjHay12LY"


async def test_endpoints():
    """Test various possible snapshot endpoints"""
    
    print("🔍 DISCOVERING SNAPSHOT ENDPOINTS")
    print("=" * 50)
    
    headers = {
        "Authorization": f"Bearer {AGENCY_TOKEN}",
        "Version": "2021-07-28",
        "Accept": "application/json"
    }
    
    # Possible snapshot endpoints based on GHL API patterns
    endpoints = [
        # V1 patterns
        f"https://services.leadconnectorhq.com/snapshots",
        f"https://services.leadconnectorhq.com/snapshots/",
        f"https://services.leadconnectorhq.com/companies/{COMPANY_ID}/snapshots",
        f"https://services.leadconnectorhq.com/locations/{LOCATION_ID}/snapshots",
        
        # V2 patterns
        f"https://rest.gohighlevel.com/v1/snapshots",
        f"https://rest.gohighlevel.com/v1/snapshots?companyId={COMPANY_ID}",
        f"https://rest.gohighlevel.com/v1/snapshots?locationId={LOCATION_ID}",
        
        # Agency patterns
        f"https://services.leadconnectorhq.com/agencies/{COMPANY_ID}/snapshots",
        f"https://services.leadconnectorhq.com/agency/snapshots",
        
        # Alternative patterns
        f"https://api.gohighlevel.com/v1/snapshots",
        f"https://backend.leadconnectorhq.com/snapshots/{COMPANY_ID}",
        
        # Templates/Snapshots
        f"https://services.leadconnectorhq.com/templates",
        f"https://services.leadconnectorhq.com/templates?companyId={COMPANY_ID}",
    ]
    
    working_endpoints = []
    
    for endpoint in endpoints:
        print(f"\n📡 Testing: {endpoint}")
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(endpoint, headers=headers)
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print("   ✅ SUCCESS! Endpoint works")
                working_endpoints.append(endpoint)
                
                try:
                    data = response.json()
                    if isinstance(data, dict):
                        print(f"   📋 Keys: {list(data.keys())}")
                    elif isinstance(data, list):
                        print(f"   📋 List with {len(data)} items")
                    
                    # Save response for analysis
                    with open(f'snapshot_response_{len(working_endpoints)}.json', 'w') as f:
                        json.dump(data, f, indent=2)
                    print(f"   💾 Response saved to snapshot_response_{len(working_endpoints)}.json")
                    
                except:
                    print("   📄 Non-JSON response")
                    
            elif response.status_code == 401:
                print("   ❌ Unauthorized")
            elif response.status_code == 403:
                print("   ❌ Forbidden")
            elif response.status_code == 404:
                print("   ❌ Not Found")
            else:
                print(f"   ❌ Error {response.status_code}")
                
        except Exception as e:
            print(f"   💥 Exception: {str(e)[:50]}...")
    
    print("\n" + "="*50)
    print("📊 SUMMARY")
    print("="*50)
    
    if working_endpoints:
        print(f"✅ Found {len(working_endpoints)} working endpoints:")
        for endpoint in working_endpoints:
            print(f"   • {endpoint}")
    else:
        print("❌ No working snapshot endpoints found")
        print("\nThis might mean:")
        print("1. Snapshots use a different API")
        print("2. Token lacks permissions")
        print("3. Snapshots are managed differently")
    
    # Test share link endpoint directly
    print("\n" + "="*50)
    print("📡 Testing Share Link Endpoint Directly")
    print("="*50)
    
    share_url = f"https://services.leadconnectorhq.com/snapshots/share/link?companyId={COMPANY_ID}"
    print(f"\nTesting: POST {share_url}")
    
    # Need a valid snapshot ID to test
    test_body = {
        "snapshot_id": "test_id",
        "share_type": "link"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                share_url,
                headers={**headers, "Content-Type": "application/json"},
                json=test_body
            )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 400:
            print("✅ Endpoint exists! (400 = bad request, needs valid snapshot_id)")
        elif response.status_code == 401:
            print("❌ Unauthorized - token issue")
        elif response.status_code == 404:
            print("❌ Endpoint not found")
        else:
            print(f"Response: {response.text[:200]}...")
            
    except Exception as e:
        print(f"💥 Exception: {str(e)}")


async def main():
    await test_endpoints()
    
    print("\n💡 NEXT STEPS:")
    print("1. If no endpoints work, snapshots might be UI-only")
    print("2. Try creating a snapshot in GHL UI first")
    print("3. Check if snapshots appear in any saved JSON files")
    print("4. May need different API token with specific scopes")


if __name__ == "__main__":
    asyncio.run(main())