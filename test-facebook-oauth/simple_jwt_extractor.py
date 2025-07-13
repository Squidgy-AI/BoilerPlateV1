#!/usr/bin/env python3
"""
Simple JWT Token Extractor for GHL
Gets JWT tokens from already logged-in browser session
"""

import asyncio
import json
import base64
from datetime import datetime
from typing import Optional
import httpx


class SimpleJWTExtractor:
    """Simple JWT token extraction from GHL"""
    
    def __init__(self, credentials: dict):
        self.credentials = credentials
        self.location_id = "lBPqgBowX1CsjHay12LY"
        self.user_id = "aZ0n4etrNCEB29sona8M"
        self.bearer_token = credentials.get('bearer_token')
    
    async def get_jwt_from_browser(self) -> Optional[str]:
        """Get JWT token from browser session"""
        print("🤖 Opening browser to extract JWT token...")
        
        try:
            from playwright.async_api import async_playwright
            
            async with async_playwright() as p:
                # Launch browser in non-headless mode so you can see what's happening
                browser = await p.chromium.launch(headless=False)
                context = await browser.new_context()
                page = await context.new_page()
                
                # Store JWT token when found
                jwt_token = None
                
                # Set up request interception to capture JWT token
                def handle_request(request):
                    nonlocal jwt_token
                    headers = request.headers
                    if 'token-id' in headers and headers['token-id'].startswith('eyJ'):
                        jwt_token = headers['token-id']
                        print(f"   ✅ JWT token captured: {jwt_token[:50]}...")
                
                page.on('request', handle_request)
                
                # Navigate to GHL
                print("   📡 Opening GHL...")
                await page.goto("https://app.gohighlevel.com/")
                
                # Wait for page to load
                await page.wait_for_load_state('networkidle')
                
                # Check if we need to login
                current_url = page.url
                print(f"   📍 Current URL: {current_url}")
                
                if 'login' in current_url.lower() or 'auth' in current_url.lower():
                    print("   🔐 Login required - Please login manually in the browser window")
                    print("   ⏳ Waiting for you to complete login...")
                    
                    # Wait for URL to change (indicating login success)
                    try:
                        await page.wait_for_url("**/location/**", timeout=60000)  # 1 minute timeout
                        print("   ✅ Login detected!")
                    except:
                        print("   ⚠️  Timeout waiting for login, continuing anyway...")
                
                # Trigger some requests to capture JWT token
                print("   🔍 Triggering requests to capture JWT token...")
                
                # Try clicking around to generate requests
                clickable_elements = [
                    'text=Dashboard',
                    'text=Conversations', 
                    'text=Opportunities',
                    'text=Contacts',
                    'text=Marketing',
                    'a[href*="dashboard"]',
                    'a[href*="conversations"]',
                    'button',
                    'nav a'
                ]
                
                for element in clickable_elements:
                    try:
                        await page.click(element, timeout=2000)
                        await page.wait_for_timeout(1000)  # Wait 1 second
                        if jwt_token:
                            break
                    except:
                        continue
                
                # If no JWT captured yet, try refreshing page
                if not jwt_token:
                    print("   🔄 Refreshing page to capture JWT...")
                    await page.reload()
                    await page.wait_for_load_state('networkidle')
                    await page.wait_for_timeout(3000)
                
                # Keep browser open for a few more seconds to capture any delayed requests
                if not jwt_token:
                    print("   ⏳ Waiting for JWT token in network requests...")
                    await page.wait_for_timeout(5000)
                
                await browser.close()
                
                if jwt_token:
                    print("   ✅ JWT token successfully extracted!")
                    return jwt_token
                else:
                    print("   ❌ No JWT token found in requests")
                    return None
                    
        except ImportError:
            print("   ❌ Playwright not available")
            return None
        except Exception as e:
            print(f"   ❌ Browser extraction failed: {e}")
            return None
    
    def analyze_jwt_token(self, token: str):
        """Analyze JWT token structure"""
        try:
            parts = token.split('.')
            payload = parts[1] + '=' * (4 - len(parts[1]) % 4)
            decoded = json.loads(base64.b64decode(payload))
            
            exp = decoded.get('exp')
            iat = decoded.get('iat')
            now = datetime.now().timestamp()
            
            print(f"\n🔍 JWT TOKEN ANALYSIS:")
            print(f"   Issued: {datetime.fromtimestamp(iat)}")
            print(f"   Expires: {datetime.fromtimestamp(exp)}")
            print(f"   Valid for: {(exp - iat) / 3600:.1f} hours")
            print(f"   Status: {'✅ VALID' if now < exp else '❌ EXPIRED'}")
            print(f"   User ID: {decoded.get('user_id')}")
            print(f"   Company ID: {decoded.get('company_id')}")
            print(f"   Locations: {len(decoded.get('locations', []))} total")
            
            return decoded
        except Exception as e:
            print(f"   ❌ Error analyzing token: {e}")
            return None
    
    async def test_jwt_with_facebook_api(self, jwt_token: str):
        """Test JWT token with Facebook APIs"""
        print(f"\n📄 TESTING JWT TOKEN WITH FACEBOOK APIs")
        print("-" * 50)
        
        headers = {
            "token-id": jwt_token,
            "channel": "APP",
            "source": "WEB_USER",
            "version": "2021-07-28",
            "accept": "application/json"
        }
        
        # Test endpoints
        endpoints = [
            {
                'name': 'Check Facebook Connection',
                'url': f"https://backend.leadconnectorhq.com/integrations/facebook/{self.location_id}/connection"
            },
            {
                'name': 'List Facebook Pages',
                'url': f"https://backend.leadconnectorhq.com/integrations/facebook/{self.location_id}/pages?getAll=true"
            }
        ]
        
        results = {}
        
        for endpoint in endpoints:
            try:
                print(f"📡 {endpoint['name']}: ", end="")
                
                async with httpx.AsyncClient() as client:
                    response = await client.get(endpoint['url'], headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ SUCCESS")
                    
                    if endpoint['name'] == 'List Facebook Pages':
                        pages = data.get('pages', data) if isinstance(data, dict) else data
                        print(f"   📄 Found {len(pages)} Facebook pages")
                        
                        for i, page in enumerate(pages[:3], 1):
                            name = page.get('name', 'Unknown')
                            page_id = page.get('id', 'Unknown')
                            print(f"      {i}. {name} (ID: {page_id})")
                    
                    results[endpoint['name']] = {
                        'success': True,
                        'data': data
                    }
                else:
                    print(f"❌ FAILED ({response.status_code})")
                    results[endpoint['name']] = {
                        'success': False,
                        'status_code': response.status_code,
                        'error': response.text
                    }
                    
            except Exception as e:
                print(f"💥 ERROR: {e}")
                results[endpoint['name']] = {
                    'success': False,
                    'error': str(e)
                }
        
        return results


async def main():
    """Simple JWT extraction and testing"""
    
    print("🚀 SIMPLE JWT TOKEN EXTRACTOR FOR GHL")
    print("🎯 Goal: Extract JWT token from browser and test Facebook APIs")
    print("=" * 70)
    
    credentials = {
        'email': 'somasekhar.addakula@gmail.com',
        'password': 'SomaOnetoo@135',
        'bearer_token': 'pit-422e9667-a801-4152-9dd1-cf34eebbd906'
    }
    
    extractor = SimpleJWTExtractor(credentials)
    
    # Step 1: Extract JWT token from browser
    print(f"\n📋 STEP 1: Extract JWT Token")
    jwt_token = await extractor.get_jwt_from_browser()
    
    if not jwt_token:
        print("❌ Could not extract JWT token automatically")
        
        # Manual fallback
        print("\n🔧 MANUAL TOKEN INPUT:")
        print("1. Open https://app.gohighlevel.com/ in another browser tab")
        print("2. Login to your account")
        print("3. Open DevTools (F12) → Network tab")
        print("4. Click around in GHL dashboard")
        print("5. Find any request → Headers → Copy 'token-id' value")
        
        try:
            manual_token = input("\nPaste JWT token here: ").strip()
            if manual_token and manual_token.startswith('eyJ'):
                jwt_token = manual_token
                print("✅ Manual token accepted")
            else:
                print("❌ Invalid token format")
                return
        except:
            print("❌ No token provided")
            return
    
    # Step 2: Analyze the token
    print(f"\n📋 STEP 2: Analyze JWT Token")
    token_analysis = extractor.analyze_jwt_token(jwt_token)
    
    if not token_analysis:
        print("❌ Could not analyze token")
        return
    
    # Step 3: Test with Facebook APIs
    print(f"\n📋 STEP 3: Test with Facebook APIs")
    facebook_results = await extractor.test_jwt_with_facebook_api(jwt_token)
    
    # Summary
    print(f"\n📊 FINAL SUMMARY")
    print("=" * 50)
    successful_endpoints = sum(1 for r in facebook_results.values() if r.get('success'))
    total_endpoints = len(facebook_results)
    
    print(f"✅ JWT Token: Successfully extracted and analyzed")
    print(f"✅ Facebook APIs: {successful_endpoints}/{total_endpoints} endpoints successful")
    
    for name, result in facebook_results.items():
        status = "✅" if result.get('success') else "❌"
        print(f"   {status} {name}")
    
    if successful_endpoints == total_endpoints:
        print(f"\n🎉 SUCCESS: JWT token is working perfectly with Facebook integration!")
        print(f"💡 Save this token for use in your applications:")
        print(f"📋 JWT Token: {jwt_token[:50]}...")
    else:
        print(f"\n⚠️  Some Facebook API endpoints failed")
        print(f"💡 Check your Facebook connection in GHL dashboard")


if __name__ == "__main__":
    asyncio.run(main())