#!/usr/bin/env python3
"""
Quick test with manual JWT token
"""

import asyncio
import json
import base64
from datetime import datetime
import httpx


async def test_jwt_token(jwt_token: str):
    """Test JWT token with Facebook APIs"""
    
    print("🔍 TESTING JWT TOKEN")
    print("=" * 50)
    
    # Analyze token
    try:
        parts = jwt_token.split('.')
        payload = parts[1] + '=' * (4 - len(parts[1]) % 4)
        decoded = json.loads(base64.b64decode(payload))
        
        exp = decoded.get('exp')
        now = datetime.now().timestamp()
        
        print(f"✅ Token Analysis:")
        print(f"   Expires: {datetime.fromtimestamp(exp)}")
        print(f"   Status: {'✅ VALID' if now < exp else '❌ EXPIRED'}")
        print(f"   User ID: {decoded.get('user_id')}")
        print(f"   Locations: {len(decoded.get('locations', []))} total")
        
        if now >= exp:
            print("❌ Token is expired - get a fresh one!")
            return
            
    except Exception as e:
        print(f"❌ Error analyzing token: {e}")
        return
    
    # Test Facebook APIs
    location_id = "lBPqgBowX1CsjHay12LY"
    
    headers = {
        "token-id": jwt_token,
        "channel": "APP",
        "source": "WEB_USER",
        "version": "2021-07-28",
        "accept": "application/json"
    }
    
    # Test connection
    print(f"\n📡 Testing Facebook Connection...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://backend.leadconnectorhq.com/integrations/facebook/{location_id}/connection",
                headers=headers
            )
        
        if response.status_code == 200:
            print(f"✅ Facebook Connection: SUCCESS")
            connection_data = response.json()
            print(f"   Data: {list(connection_data.keys())}")
        else:
            print(f"❌ Facebook Connection: FAILED ({response.status_code})")
            return
            
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return
    
    # Test pages
    print(f"\n📄 Testing Facebook Pages...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://backend.leadconnectorhq.com/integrations/facebook/{location_id}/pages?getAll=true",
                headers=headers
            )
        
        if response.status_code == 200:
            data = response.json()
            pages = data.get('pages', data) if isinstance(data, dict) else data
            print(f"✅ Facebook Pages: SUCCESS")
            print(f"   Found {len(pages)} pages")
            
            for i, page in enumerate(pages[:3], 1):
                name = page.get('name', 'Unknown')
                page_id = page.get('id', 'Unknown')
                print(f"      {i}. {name} (ID: {page_id})")
                
        else:
            print(f"❌ Facebook Pages: FAILED ({response.status_code})")
            
    except Exception as e:
        print(f"❌ Pages test failed: {e}")
    
    print(f"\n🎉 JWT TOKEN IS WORKING! You can use this for your Facebook integration.")


async def main():
    print("🚀 QUICK JWT TOKEN TEST")
    print("=" * 30)
    
    # Get token from user
    print("Get JWT token from GHL:")
    print("1. Login to https://app.gohighlevel.com/")
    print("2. Open DevTools (F12) → Network tab")
    print("3. Click around in GHL")
    print("4. Copy 'token-id' from any request")
    print()
    
    try:
        jwt_token = input("Paste JWT token: ").strip()
        
        if not jwt_token or not jwt_token.startswith('eyJ'):
            print("❌ Invalid JWT token format")
            return
        
        await test_jwt_token(jwt_token)
        
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(main())