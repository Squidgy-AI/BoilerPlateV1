#!/usr/bin/env python3
"""
Test Facebook Endpoints with Fresh JWT Token
Hit the Facebook endpoints from your network data and display results
"""

import asyncio
import json
import base64
from datetime import datetime
import httpx


async def test_facebook_endpoints_with_jwt():
    """Test Facebook endpoints using fresh JWT token"""
    
    print("🚀 FACEBOOK ENDPOINTS TEST WITH JWT")
    print("🎯 Testing endpoints from your network data")
    print("=" * 60)
    
    # Get fresh JWT token from the user
    print("📋 To get a fresh JWT token:")
    print("1. Run: python demo_business_login.py")
    print("2. Or extract manually from GHL network tab")
    print("3. Paste the JWT token below")
    print()
    
    try:
        jwt_token = input("🔑 Paste your JWT token: ").strip()
        
        if not jwt_token or not jwt_token.startswith('eyJ'):
            print("❌ Invalid JWT token format")
            return
        
        print("✅ JWT token received")
        
    except KeyboardInterrupt:
        print("\n👋 Cancelled")
        return
    
    # Analyze the token first
    print(f"\n📋 STEP 1: JWT Token Analysis")
    try:
        parts = jwt_token.split('.')
        payload = parts[1] + '=' * (4 - len(parts[1]) % 4)
        decoded = json.loads(base64.b64decode(payload))
        
        exp = decoded.get('exp')
        now = datetime.now().timestamp()
        
        print(f"✅ Token Details:")
        print(f"   User ID: {decoded.get('user_id')}")
        print(f"   Company ID: {decoded.get('company_id')}")
        print(f"   Locations: {len(decoded.get('locations', []))} available")
        print(f"   Expires: {datetime.fromtimestamp(exp)}")
        print(f"   Status: {'✅ VALID' if now < exp else '❌ EXPIRED'}")
        
        if now >= exp:
            print("❌ Token is expired - get a fresh one!")
            return
            
    except Exception as e:
        print(f"❌ Error analyzing token: {e}")
        return
    
    # Configuration from your network data
    location_id = "lBPqgBowX1CsjHay12LY"
    
    # Headers from your successful network requests
    headers = {
        "token-id": jwt_token,
        "channel": "APP",
        "source": "WEB_USER", 
        "version": "2021-07-28",
        "accept": "application/json",
        "content-type": "application/json"
    }
    
    print(f"\n📋 STEP 2: Testing Facebook Endpoints")
    print(f"🎯 Location ID: {location_id}")
    print("-" * 50)
    
    # Test endpoints from your network data
    endpoints = [
        {
            "name": "Facebook Connection Status",
            "method": "GET",
            "url": f"https://backend.leadconnectorhq.com/integrations/facebook/{location_id}/connection",
            "description": "Check if Facebook is connected to this location"
        },
        {
            "name": "Facebook Pages List (All)",
            "method": "GET", 
            "url": f"https://backend.leadconnectorhq.com/integrations/facebook/{location_id}/allPages?limit=20",
            "description": "Get all available Facebook pages"
        },
        {
            "name": "Facebook Pages List (Attached)",
            "method": "GET",
            "url": f"https://backend.leadconnectorhq.com/integrations/facebook/{location_id}/pages?getAll=true",
            "description": "Get attached Facebook pages"
        }
    ]
    
    results = {}
    
    for i, endpoint in enumerate(endpoints, 1):
        print(f"\n📡 Test {i}: {endpoint['name']}")
        print(f"   URL: {endpoint['url']}")
        print(f"   Description: {endpoint['description']}")
        print(f"   Testing: ", end="")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                if endpoint['method'] == 'GET':
                    response = await client.get(endpoint['url'], headers=headers)
                else:
                    response = await client.post(endpoint['url'], headers=headers)
            
            if response.status_code == 200:
                print(f"✅ SUCCESS")
                
                try:
                    data = response.json()
                    results[endpoint['name']] = {
                        'success': True,
                        'status_code': 200,
                        'data': data
                    }
                    
                    # Display relevant data based on endpoint
                    if 'connection' in endpoint['url'].lower():
                        print(f"   📊 Connection Data:")
                        if isinstance(data, dict):
                            for key, value in data.items():
                                if key in ['connected', 'status', 'accountId', 'accountName']:
                                    print(f"      {key}: {value}")
                    
                    elif 'pages' in endpoint['url'].lower():
                        # Handle different response formats
                        pages = data
                        if isinstance(data, dict):
                            pages = data.get('pages', data.get('results', []))
                        
                        if isinstance(pages, list):
                            print(f"   📄 Found {len(pages)} pages:")
                            for j, page in enumerate(pages[:5], 1):  # Show first 5 pages
                                name = page.get('name', 'Unknown')
                                page_id = page.get('id', 'Unknown')
                                attached = page.get('attached', page.get('isAttached', 'Unknown'))
                                print(f"      {j}. {name} (ID: {page_id}) - Attached: {attached}")
                            
                            if len(pages) > 5:
                                print(f"      ... and {len(pages) - 5} more pages")
                        else:
                            print(f"   📄 Pages data: {type(pages)} - {pages}")
                    
                except json.JSONDecodeError:
                    print(f"   📄 Raw response: {response.text[:200]}...")
                    results[endpoint['name']] = {
                        'success': True,
                        'status_code': 200,
                        'raw_data': response.text
                    }
                
            else:
                print(f"❌ FAILED ({response.status_code})")
                print(f"   Error: {response.text[:200]}...")
                results[endpoint['name']] = {
                    'success': False,
                    'status_code': response.status_code,
                    'error': response.text
                }
                
        except Exception as e:
            print(f"💥 ERROR: {str(e)[:100]}...")
            results[endpoint['name']] = {
                'success': False,
                'error': str(e)
            }
    
    # Display comprehensive summary
    print(f"\n📊 COMPREHENSIVE RESULTS SUMMARY")
    print("=" * 60)
    
    successful_tests = sum(1 for r in results.values() if r.get('success'))
    total_tests = len(results)
    
    print(f"✅ Tests Passed: {successful_tests}/{total_tests}")
    print(f"📊 Success Rate: {(successful_tests/total_tests)*100:.1f}%")
    
    print(f"\n📋 Detailed Results:")
    for name, result in results.items():
        status = "✅ SUCCESS" if result.get('success') else "❌ FAILED"
        print(f"\n   {status} - {name}")
        
        if result.get('success'):
            if 'data' in result:
                data = result['data']
                if isinstance(data, dict):
                    print(f"      Data keys: {list(data.keys())}")
                elif isinstance(data, list):
                    print(f"      Array length: {len(data)}")
                else:
                    print(f"      Data type: {type(data)}")
        else:
            if 'status_code' in result:
                print(f"      Status Code: {result['status_code']}")
            if 'error' in result:
                error_preview = str(result['error'])[:100]
                print(f"      Error: {error_preview}...")
    
    # Provide next steps
    print(f"\n🎯 NEXT STEPS")
    print("-" * 30)
    
    if successful_tests == total_tests:
        print("🎉 All tests passed! Your Facebook integration is working perfectly.")
        print("💡 You can now use this JWT token in your application.")
        print(f"📋 Token valid until: {datetime.fromtimestamp(exp)}")
        
        print(f"\n🔧 Sample code for your application:")
        print(f"```python")
        print(f"headers = {{")
        print(f"    'token-id': '{jwt_token[:30]}...',")
        print(f"    'channel': 'APP',")
        print(f"    'source': 'WEB_USER',") 
        print(f"    'version': '2021-07-28'")
        print(f"}}")
        print(f"")
        print(f"# Get Facebook pages")
        print(f"response = requests.get(")
        print(f"    'https://backend.leadconnectorhq.com/integrations/facebook/{location_id}/pages?getAll=true',")
        print(f"    headers=headers")
        print(f")")
        print(f"```")
        
    elif successful_tests > 0:
        print("⚠️  Some tests passed, some failed.")
        print("💡 Check your Facebook connection in GHL dashboard.")
        print("🔄 You may need to reconnect Facebook OAuth.")
        
    else:
        print("❌ All tests failed.")
        print("💡 Possible issues:")
        print("   • JWT token may be expired")
        print("   • Facebook not connected to this location")
        print("   • Network connectivity issues")
        print("   • API endpoint changes")
    
    print(f"\n📱 To get a fresh JWT token anytime:")
    print(f"   python demo_business_login.py")


async def main():
    await test_facebook_endpoints_with_jwt()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")