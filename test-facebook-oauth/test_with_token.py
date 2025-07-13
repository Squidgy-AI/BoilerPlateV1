#!/usr/bin/env python3
"""
Test Facebook Endpoints with JWT Token
Paste your JWT token in the script and run it
"""

import asyncio
import json
import base64
from datetime import datetime
import httpx


# 🔧 FRESH JWT TOKEN FROM DEMO:
JWT_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg3NzQ4NTAwMmYwNWJlMDI2N2VmNDU5ZjViNTEzNTMzYjVjNThjMTIiLCJ0eXAiOiJKV1QifQ.eyJ1c2VyX2lkIjoiYVowbjRldHJOQ0VCMjlzb25hOE0iLCJjb21wYW55X2lkIjoibHAycDFxMjdEcmRHdGExcUdESmQiLCJyb2xlIjoiYWRtaW4iLCJ0eXBlIjoiYWdlbmN5IiwidmVyc2lvbiI6MiwibG9jYXRpb25zIjpbXSwicGVybWlzc2lvbnMiOnsid29ya2Zsb3dzX2VuYWJsZWQiOnRydWUsIndvcmtmbG93c19yZWFkX29ubHkiOmZhbHNlfSwicHJpbWFyeVVzZXIiOnt9LCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vaGlnaGxldmVsLWJhY2tlbmQiLCJhdWQiOiJoaWdobGV2ZWwtYmFja2VuZCIsImF1dGhfdGltZSI6MTc1MTc3MzMzNywic3ViIjoiYVowbjRldHJOQ0VCMjlzb25hOE0iLCJpYXQiOjE3NTE3NzMzMzcsImV4cCI6MTc1MTc3NjkzNywiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6e30sInNpZ25faW5fcHJvdmlkZXIiOiJjdXN0b20ifX0.FpG4qqAw9q86iS_tTT1GBP1z16rnWCqLbeTQyzaq9TIRvXtBvajWsv7iHlawIavsQVZX1afho5KI1FZ8vwewCa3ziInH2ePDga0F6M32PCcuFJWKhvi6dGRPpVaXhrvEd_hdU7d486ose7uZRF5Z6Vwg8YjaDxApvTOkiHznxXaC07rdmdianGMPUIerVqXXGhECv9NBMbGzLNGGfTnGQiAyIHBTi74rzHoJHrATFqvt-3YQlLub_uQGeQdd31rU0Qumknibvn1CmSIMljLQuB2BJRswxd4uTflYl5orvow5u61MM1OjrDwBbnWPcEnolJt_YuReRLaq7q1k3o6L7w"


async def test_facebook_endpoints():
    """Test Facebook endpoints using the JWT token"""
    
    print("🚀 FACEBOOK ENDPOINTS TEST")
    print("🎯 Testing endpoints from your network data")
    print("=" * 60)
    
    # Check if token was updated
    if "SAMPLE_SIGNATURE_FOR_DEMO" in JWT_TOKEN:
        print("⚠️  WARNING: Using demo token from demo_business_login.py")
        print("🔄 This may not work with real APIs")
    
    # Analyze the token first
    print(f"\n📋 STEP 1: JWT Token Analysis")
    try:
        parts = JWT_TOKEN.split('.')
        payload = parts[1] + '=' * (4 - len(parts[1]) % 4)
        decoded = json.loads(base64.b64decode(payload))
        
        exp = decoded.get('exp')
        iat = decoded.get('iat')
        now = datetime.now().timestamp()
        
        print(f"✅ Token Details:")
        print(f"   User ID: {decoded.get('user_id')}")
        print(f"   Company ID: {decoded.get('company_id')}")
        print(f"   Locations: {len(decoded.get('locations', []))} available")
        print(f"   Issued: {datetime.fromtimestamp(iat)}")
        print(f"   Expires: {datetime.fromtimestamp(exp)}")
        print(f"   Valid for: {(exp - iat) / 3600:.1f} hours")
        print(f"   Status: {'✅ VALID' if now < exp else '❌ EXPIRED'}")
        
        if now >= exp:
            print("❌ Token is expired - get a fresh one!")
            print("🔄 Run: python demo_business_login.py")
            return
            
    except Exception as e:
        print(f"❌ Error analyzing token: {e}")
        return
    
    # Configuration
    location_id = "lBPqgBowX1CsjHay12LY"
    
    # Headers from successful network requests
    headers = {
        "token-id": JWT_TOKEN,
        "channel": "APP",
        "source": "WEB_USER", 
        "version": "2021-07-28",
        "accept": "application/json"
    }
    
    print(f"\n📋 STEP 2: Testing Facebook Endpoints")
    print(f"🎯 Location ID: {location_id}")
    print("-" * 50)
    
    # Test endpoints from your network data
    endpoints = [
        {
            "name": "Facebook Connection Status",
            "url": f"https://backend.leadconnectorhq.com/integrations/facebook/{location_id}/connection",
            "description": "Check if Facebook is connected"
        },
        {
            "name": "Facebook Pages (All Available)",
            "url": f"https://backend.leadconnectorhq.com/integrations/facebook/{location_id}/allPages?limit=20",
            "description": "All pages from Facebook account"
        },
        {
            "name": "Facebook Pages (Attached to GHL)",
            "url": f"https://backend.leadconnectorhq.com/integrations/facebook/{location_id}/pages?getAll=true",
            "description": "Pages attached to this GHL location"
        }
    ]
    
    results = {}
    
    for i, endpoint in enumerate(endpoints, 1):
        print(f"\n📡 Test {i}: {endpoint['name']}")
        print(f"   📝 {endpoint['description']}")
        print(f"   🌐 URL: {endpoint['url']}")
        print(f"   ⏳ Testing: ", end="", flush=True)
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(endpoint['url'], headers=headers)
            
            if response.status_code == 200:
                print(f"✅ SUCCESS")
                
                try:
                    data = response.json()
                    results[endpoint['name']] = {
                        'success': True,
                        'status_code': 200,
                        'data': data
                    }
                    
                    # Display relevant data
                    if 'connection' in endpoint['url'].lower():
                        print(f"      📊 Connection Info:")
                        if isinstance(data, dict):
                            important_keys = ['connected', 'status', 'accountId', 'accountName', 'email']
                            for key in important_keys:
                                if key in data:
                                    print(f"         {key}: {data[key]}")
                            
                            # Show all keys for debugging
                            print(f"         Available data: {list(data.keys())}")
                    
                    elif 'pages' in endpoint['url'].lower():
                        # Handle different response formats
                        pages = data
                        if isinstance(data, dict):
                            pages = data.get('pages', data.get('results', data.get('data', [])))
                        
                        if isinstance(pages, list) and len(pages) > 0:
                            print(f"      📄 Found {len(pages)} pages:")
                            for j, page in enumerate(pages[:5], 1):
                                name = page.get('name', 'Unknown')
                                page_id = page.get('id', 'Unknown')
                                attached = page.get('attached', page.get('isAttached', page.get('connected', 'Unknown')))
                                print(f"         {j}. {name}")
                                print(f"            ID: {page_id}")
                                print(f"            Attached: {attached}")
                            
                            if len(pages) > 5:
                                print(f"         ... and {len(pages) - 5} more pages")
                        elif isinstance(pages, list):
                            print(f"      📄 No pages found (empty list)")
                        else:
                            print(f"      📄 Response format: {type(data)}")
                            print(f"         Keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                
                except json.JSONDecodeError:
                    print(f"      📄 Raw response: {response.text[:200]}...")
                    results[endpoint['name']] = {
                        'success': True,
                        'status_code': 200,
                        'raw_data': response.text
                    }
                
            else:
                print(f"❌ FAILED ({response.status_code})")
                print(f"      Error: {response.text[:200]}...")
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
    
    # Summary
    print(f"\n📊 FINAL SUMMARY")
    print("=" * 50)
    
    successful_tests = sum(1 for r in results.values() if r.get('success'))
    total_tests = len(results)
    
    print(f"✅ Success Rate: {successful_tests}/{total_tests} ({(successful_tests/total_tests)*100:.1f}%)")
    
    for name, result in results.items():
        status = "✅" if result.get('success') else "❌"
        print(f"{status} {name}")
        if not result.get('success') and result.get('status_code'):
            print(f"    Status: {result['status_code']}")
    
    if successful_tests == total_tests:
        print(f"\n🎉 ALL TESTS PASSED!")
        print(f"💡 Your Facebook integration is working perfectly")
        print(f"🔧 You can use this JWT token in your application")
    elif successful_tests > 0:
        print(f"\n⚠️  PARTIAL SUCCESS")
        print(f"💡 Some endpoints work, check Facebook connection in GHL")
    else:
        print(f"\n❌ ALL TESTS FAILED")
        print(f"💡 Check if Facebook is connected in GHL dashboard")
        print(f"🔄 Try getting a fresh JWT token")


async def main():
    await test_facebook_endpoints()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"\n❌ Error: {e}")