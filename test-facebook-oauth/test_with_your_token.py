#!/usr/bin/env python3
"""
Test Facebook integration with your JWT token
Just paste your JWT token in the script and run it
"""

import asyncio
import json
import base64
from datetime import datetime
import httpx


# 🔧 PASTE YOUR JWT TOKEN HERE:
JWT_TOKEN = "PASTE_YOUR_JWT_TOKEN_HERE"

# Your configuration
LOCATION_ID = "lBPqgBowX1CsjHay12LY"
USER_ID = "aZ0n4etrNCEB29sona8M"
BEARER_TOKEN = "pit-422e9667-a801-4152-9dd1-cf34eebbd906"


async def test_complete_facebook_integration():
    """Test complete Facebook integration"""
    
    print("🚀 COMPLETE FACEBOOK INTEGRATION TEST")
    print("🎯 Testing both JWT method and OAuth method")
    print("=" * 60)
    
    if JWT_TOKEN == "PASTE_YOUR_JWT_TOKEN_HERE":
        print("❌ Please update JWT_TOKEN in the script with your actual token")
        print("\n📋 HOW TO GET JWT TOKEN:")
        print("1. Open https://app.gohighlevel.com/")
        print("2. Login to your account")
        print("3. Open DevTools (F12) → Network tab")
        print("4. Click anywhere in GHL dashboard")
        print("5. Find any request → Headers → Copy 'token-id' value")
        print("6. Replace JWT_TOKEN in this script")
        print("7. Run the script again")
        return
    
    # Test 1: Analyze JWT token
    print(f"\n📋 STEP 1: JWT Token Analysis")
    try:
        parts = JWT_TOKEN.split('.')
        payload = parts[1] + '=' * (4 - len(parts[1]) % 4)
        decoded = json.loads(base64.b64decode(payload))
        
        exp = decoded.get('exp')
        iat = decoded.get('iat')
        now = datetime.now().timestamp()
        
        print(f"✅ Token Details:")
        print(f"   Issued: {datetime.fromtimestamp(iat)}")
        print(f"   Expires: {datetime.fromtimestamp(exp)}")
        print(f"   Valid for: {(exp - iat) / 3600:.1f} hours")
        print(f"   Status: {'✅ VALID' if now < exp else '❌ EXPIRED'}")
        print(f"   User ID: {decoded.get('user_id')}")
        print(f"   Company ID: {decoded.get('company_id')}")
        print(f"   Locations: {len(decoded.get('locations', []))} total")
        
        if now >= exp:
            print("❌ Token is expired - get a fresh one!")
            return
            
    except Exception as e:
        print(f"❌ Error analyzing token: {e}")
        return
    
    # Test 2: Backend API with JWT (Method 1)
    print(f"\n📋 STEP 2: Facebook Backend API (JWT Method)")
    jwt_headers = {
        "token-id": JWT_TOKEN,
        "channel": "APP",
        "source": "WEB_USER",
        "version": "2021-07-28",
        "accept": "application/json"
    }
    
    backend_results = {}
    
    # Test connection
    try:
        print(f"📡 Testing connection: ", end="")
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://backend.leadconnectorhq.com/integrations/facebook/{LOCATION_ID}/connection",
                headers=jwt_headers
            )
        
        if response.status_code == 200:
            print(f"✅ SUCCESS")
            backend_results['connection'] = response.json()
        else:
            print(f"❌ FAILED ({response.status_code})")
            backend_results['connection'] = None
            
    except Exception as e:
        print(f"💥 ERROR: {e}")
        backend_results['connection'] = None
    
    # Test pages
    try:
        print(f"📡 Testing pages list: ", end="")
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://backend.leadconnectorhq.com/integrations/facebook/{LOCATION_ID}/pages?getAll=true",
                headers=jwt_headers
            )
        
        if response.status_code == 200:
            data = response.json()
            pages = data.get('pages', data) if isinstance(data, dict) else data
            print(f"✅ SUCCESS ({len(pages)} pages)")
            
            for i, page in enumerate(pages[:3], 1):
                name = page.get('name', 'Unknown')
                page_id = page.get('id', 'Unknown')
                print(f"      {i}. {name} (ID: {page_id})")
            
            backend_results['pages'] = pages
        else:
            print(f"❌ FAILED ({response.status_code})")
            backend_results['pages'] = None
            
    except Exception as e:
        print(f"💥 ERROR: {e}")
        backend_results['pages'] = None
    
    # Test 3: OAuth API with Bearer Token (Method 2)
    print(f"\n📋 STEP 3: Facebook OAuth API (Bearer Token Method)")
    
    # First, try to find Account ID from connection data
    account_id = None
    if backend_results.get('connection'):
        connection_data = backend_results['connection']
        possible_account_ids = [
            connection_data.get('accountId'),
            connection_data.get('account_id'),
            connection_data.get('id'),
            connection_data.get('facebook_account_id')
        ]
        
        for acc_id in possible_account_ids:
            if acc_id:
                account_id = acc_id
                break
    
    if not account_id:
        # Use location ID as fallback
        account_id = LOCATION_ID
        print(f"📋 Using location ID as account ID: {account_id}")
    else:
        print(f"📋 Found account ID: {account_id}")
    
    # Test OAuth API
    oauth_headers = {
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "Version": "2021-07-28",
        "Accept": "application/json"
    }
    
    try:
        print(f"📡 Testing OAuth API: ", end="")
        oauth_url = f"https://services.leadconnectorhq.com/social-media-posting/oauth/{LOCATION_ID}/facebook/accounts/{account_id}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(oauth_url, headers=oauth_headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS")
            
            if data.get('success') and data.get('results', {}).get('pages'):
                oauth_pages = data['results']['pages']
                print(f"   📄 Found {len(oauth_pages)} pages via OAuth API")
                
                for i, page in enumerate(oauth_pages[:3], 1):
                    name = page.get('name', 'Unknown')
                    page_id = page.get('id', 'Unknown')
                    print(f"      {i}. {name} (ID: {page_id})")
            
        else:
            print(f"❌ FAILED ({response.status_code})")
            print(f"   Error: {response.text}")
            
    except Exception as e:
        print(f"💥 ERROR: {e}")
    
    # Test 4: OAuth Flow URL Generation
    print(f"\n📋 STEP 4: OAuth Flow URL Generation")
    try:
        oauth_start_url = f"https://services.leadconnectorhq.com/social-media-posting/oauth/facebook/start?locationId={LOCATION_ID}&userId={USER_ID}"
        print(f"📡 OAuth Start URL: {oauth_start_url}")
        print(f"🌐 This URL would open Facebook OAuth in a window")
        print(f"📋 After OAuth, you'd get an Account ID from window.addEventListener")
        
    except Exception as e:
        print(f"💥 ERROR: {e}")
    
    # Summary
    print(f"\n📊 FINAL SUMMARY")
    print("=" * 50)
    
    jwt_success = backend_results.get('connection') is not None and backend_results.get('pages') is not None
    print(f"✅ JWT Token: {'Working perfectly' if jwt_success else 'Some issues'}")
    print(f"✅ Backend API: {'Success' if jwt_success else 'Failed'}")
    print(f"✅ OAuth API: Test completed (check results above)")
    
    if jwt_success:
        print(f"\n🎉 YOUR FACEBOOK INTEGRATION IS WORKING!")
        print(f"💡 You can use the JWT method for your application")
        print(f"📋 JWT Token: {JWT_TOKEN[:50]}...")
        
        # Show how to use it in production
        print(f"\n🔧 PRODUCTION USAGE:")
        print(f"```python")
        print(f"headers = {{")
        print(f"    'token-id': '{JWT_TOKEN[:20]}...',")
        print(f"    'channel': 'APP',")
        print(f"    'source': 'WEB_USER',")
        print(f"    'version': '2021-07-28'")
        print(f"}}")
        print(f"")
        print(f"# Get Facebook pages")
        print(f"response = requests.get(")
        print(f"    'https://backend.leadconnectorhq.com/integrations/facebook/{LOCATION_ID}/pages?getAll=true',")
        print(f"    headers=headers")
        print(f")")
        print(f"```")
    else:
        print(f"\n⚠️  Some issues detected - check Facebook connection in GHL dashboard")


async def main():
    await test_complete_facebook_integration()


if __name__ == "__main__":
    asyncio.run(main())