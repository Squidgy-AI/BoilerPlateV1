#!/usr/bin/env python3
"""
🚀 COMPLETE FACEBOOK PAGES VIEWER - ONE SCRIPT DOES EVERYTHING
🎯 For Business Users - Zero Technical Knowledge Required

WHAT THIS SCRIPT DOES:
=====================
1. 🔒 Opens fresh incognito browser (no stored login data)
2. 🔐 Auto-fills your GoHighLevel credentials  
3. 📱 Handles MFA approval (you approve on mobile if needed)
4. 🔍 Extracts JWT access token automatically in background
5. 📡 Tests all Facebook API endpoints with detailed logging
6. 📄 Shows you ALL your Facebook pages with complete details
7. 🔗 Shows what's currently connected to GHL
8. 📋 Attempts to attach/connect any unconnected pages
9. 📊 Provides comprehensive analysis and business summary

HOW TO RUN:
==========
1. FIRST - UPDATE YOUR CREDENTIALS in this script:
   - Open this file in a text editor
   - Find the __init__ method (around line 110)
   - Replace 'YOUR_EMAIL@example.com' with your GHL email
   - Replace 'YOUR_PASSWORD_HERE' with your GHL password
   - Replace 'YOUR_LOCATION_ID_HERE' with your GHL location ID
   
   How to find your Location ID:
   - Login to GoHighLevel
   - Look at the URL: app.gohighlevel.com/location/YOUR_LOCATION_ID/dashboard
   - Copy the location ID from the URL

2. Install dependencies:
   pip install playwright httpx asyncio

3. Install Playwright browsers (one time setup):
   playwright install

4. Run the script:
   python complete_facebook_viewer.py

5. The script will:
   - Start automatically after 3 seconds
   - Open an incognito browser window
   - Auto-fill your credentials
   - Handle login and MFA (approve on mobile if prompted)
   - Extract JWT token and test all Facebook endpoints
   - Show detailed results and analysis

WHAT YOU'LL SEE:
===============
✅ Step-by-step login process with status updates
✅ JWT token extraction and analysis  
✅ Detailed Facebook connection status
✅ Complete list of your Facebook pages with all details
✅ What pages are connected to GHL
✅ Automatic attempt to connect unconnected pages
✅ Business-friendly summary of your Facebook integration

BUSINESS VALUE:
==============
🎯 Know exactly which Facebook pages you have
📊 See which pages are connected to GHL for marketing
🔍 Verify your Facebook integration is working properly
💼 No technical knowledge required - just run and see results
🚀 Complete automation - one click shows everything

TECHNICAL DETAILS:
=================
- Uses fresh incognito browser session every time
- Automatically handles GoHighLevel OAuth login flow
- Extracts Firebase JWT tokens from browser network requests  
- Tests 4 Facebook API endpoints with comprehensive logging
- Handles MFA and login edge cases gracefully
- Provides detailed JSON response analysis
- Attempts to attach unconnected pages via POST API

TROUBLESHOOTING:
===============
If the script fails:
1. Make sure you have internet connection
2. Verify your GHL credentials are correct in the script
3. Try running again (sometimes network issues occur)
4. Check that Playwright is installed: playwright install
5. Approve MFA prompts quickly when they appear

AUTHOR: Claude Code Assistant
VERSION: 1.0 - Complete Facebook Integration Viewer
LAST UPDATED: July 2025
"""

import asyncio
import json
import base64
import time
from datetime import datetime
from typing import Optional
import httpx


class CompleteFacebookViewer:
    """
    Main class that handles the complete Facebook integration testing workflow
    
    This class provides a complete automation solution for business users to:
    - Login to GoHighLevel automatically
    - Extract JWT tokens from browser sessions
    - Test all Facebook API endpoints
    - Display Facebook pages and connection status
    - Attach unconnected pages automatically
    """
    
    def __init__(self):
        # JWT token storage (extracted during browser session)
        self.jwt_token = None
        
        # GHL Location ID (specific to user's account)
        # Nestle LLC - SOMA TEST location
        self.location_id = "lBPqgBowX1CsjHay12LY"
        
        # User credentials for automatic login
        # Using Ovi Colton's credentials (User role)
        self.credentials = {
            'email': 'ovi.chand@gmail.com',
            'password': 'Dummy@123'
        }
    
    def show_welcome(self):
        """Business user welcome screen"""
        print("🚀 COMPLETE FACEBOOK PAGES VIEWER")
        print("🎯 ONE-CLICK SOLUTION FOR BUSINESS USERS")
        print("=" * 60)
        print("This script will automatically:")
        print("✅ Open fresh incognito browser (no stored login)")
        print("✅ Auto-fill your GHL credentials")
        print("✅ Handle MFA (you approve on mobile if needed)")
        print("✅ Extract access token in background")
        print("✅ Test all Facebook connections")
        print("✅ Show you ALL your Facebook pages")
        print("✅ Show what's connected to GHL")
        print()
        print("💡 Just sit back and let it work!")
        print("🔒 Uses incognito mode for fresh login every time")
        print("📱 You may need to approve MFA on your mobile")
        print()
        
        print("🚀 Starting automatically in 3 seconds...")
        import time
        time.sleep(3)
    
    async def auto_extract_jwt_token(self) -> Optional[str]:
        """Automatically extract JWT token from GHL"""
        
        print(f"\n🔄 STEP 1: AUTOMATIC LOGIN & TOKEN EXTRACTION")
        print("=" * 55)
        print("📱 Opening browser...")
        print("🔐 Handling login automatically...")
        print("📱 If you see MFA, approve it on your mobile")
        print("🔍 Extracting your access token...")
        print()
        
        try:
            from playwright.async_api import async_playwright
            
            async with async_playwright() as p:
                # Launch completely fresh browser session
                browser = await p.chromium.launch(
                    headless=False,
                    args=[
                        '--start-maximized',
                        '--incognito',  # Incognito mode
                        '--disable-web-security',  # Allow cross-origin
                        '--disable-features=VizDisplayCompositor',  # Better rendering
                        '--no-first-run',  # Skip first run setup
                        '--disable-default-apps',  # No default apps
                        '--disable-sync'  # No sync with existing profile
                    ]
                )
                
                # Create completely fresh context
                context = await browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    storage_state=None,  # No stored state
                    ignore_https_errors=True,  # Ignore SSL issues
                    # Clear all cached data
                    extra_http_headers={
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                )
                page = await context.new_page()
                
                # JWT token capture
                jwt_token = None
                request_count = 0
                
                def handle_request(request):
                    nonlocal jwt_token, request_count
                    request_count += 1
                    
                    # Only capture first JWT token found
                    if not jwt_token:
                        headers = request.headers
                        if 'token-id' in headers and headers['token-id'].startswith('eyJ'):
                            jwt_token = headers['token-id']
                            print(f"   ✅ Access token captured! (Request #{request_count})")
                
                page.on('request', handle_request)
                
                # Navigate to GHL login page directly (force login)
                print("   🌐 Opening GoHighLevel login page...")
                await page.goto("https://app.gohighlevel.com/login", wait_until='networkidle')
                
                current_url = page.url
                print(f"   📍 Current page: {current_url}")
                
                # Wait a moment for page to fully load
                await page.wait_for_timeout(2000)
                
                # Force login process (since we're in fresh incognito)
                print("   🔐 Fresh incognito session - entering credentials...")
                
                # Check if we can see login form
                try:
                    await page.wait_for_selector('input[type="email"], input[name="email"]', timeout=5000)
                    print("   ✅ Login form detected")
                except:
                    print("   ⚠️  Login form not found, trying alternative approach...")
                    # Try going to main page and then login
                    await page.goto("https://app.gohighlevel.com/", wait_until='networkidle')
                    await page.wait_for_timeout(2000)
                
                # Perform login
                login_success = await self._auto_login(page)
                
                if login_success:
                    print("   ⏳ Waiting for dashboard (you may need to approve MFA)...")
                    try:
                        await self._wait_for_dashboard(page)
                        print("   ✅ Dashboard loaded successfully")
                    except:
                        print("   ⚠️  Dashboard timeout, but continuing...")
                    
                    print("   🔍 Extracting access token...")
                    await self._trigger_requests(page)
                    await page.wait_for_timeout(3000)
                    
                    if not jwt_token:
                        print("   🔄 Trying additional token extraction methods...")
                        try:
                            await page.reload(wait_until='networkidle')
                            await self._trigger_requests(page)
                            await page.wait_for_timeout(3000)
                        except:
                            print("   ⚠️  Page reload failed, but may have token already...")
                else:
                    print("   ❌ Login failed")
                
                await browser.close()
                
                if jwt_token:
                    print("   🎉 SUCCESS: Access token extracted!")
                    return jwt_token
                else:
                    print("   ❌ Could not extract access token")
                    return None
                    
        except ImportError:
            print("   ❌ Browser automation not available")
            print("   💡 Please install: pip install playwright")
            return None
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return None
    
    async def _auto_login(self, page):
        """Handle login automatically with better error handling"""
        
        # Wait for page to be fully loaded
        await page.wait_for_load_state('networkidle')
        
        # Email field
        email_selectors = [
            'input[type="email"]', 
            'input[name="email"]', 
            'input[placeholder*="email" i]',
            '#email'
        ]
        
        email_filled = False
        for selector in email_selectors:
            try:
                await page.wait_for_selector(selector, timeout=5000)
                await page.fill(selector, '')  # Clear any existing content
                await page.fill(selector, self.credentials['email'])
                print("   📧 Email entered successfully")
                email_filled = True
                break
            except Exception as e:
                print(f"   ⚠️  Email selector {selector} failed: {str(e)[:50]}...")
                continue
        
        if not email_filled:
            print("   ❌ Could not find email field")
            return False
        
        # Small delay between fields
        await page.wait_for_timeout(1000)
        
        # Password field
        password_selectors = [
            'input[type="password"]', 
            'input[name="password"]',
            '#password'
        ]
        
        password_filled = False
        for selector in password_selectors:
            try:
                await page.wait_for_selector(selector, timeout=5000)
                await page.fill(selector, '')  # Clear any existing content
                await page.fill(selector, self.credentials['password'])
                print("   🔐 Password entered successfully")
                password_filled = True
                break
            except Exception as e:
                print(f"   ⚠️  Password selector {selector} failed: {str(e)[:50]}...")
                continue
        
        if not password_filled:
            print("   ❌ Could not find password field")
            return False
        
        # Small delay before submit
        await page.wait_for_timeout(1000)
        
        # Submit button
        login_selectors = [
            'button[type="submit"]', 
            'button:has-text("Sign In")', 
            'button:has-text("Log In")',
            'button:has-text("Login")',
            'input[type="submit"]',
            '.login-btn',
            '#login-button'
        ]
        
        login_submitted = False
        for selector in login_selectors:
            try:
                await page.wait_for_selector(selector, timeout=5000)
                await page.click(selector)
                print("   🔄 Login submitted successfully")
                login_submitted = True
                break
            except Exception as e:
                print(f"   ⚠️  Login selector {selector} failed: {str(e)[:50]}...")
                continue
        
        if not login_submitted:
            print("   ❌ Could not find login button")
            return False
        
        return True
    
    async def _wait_for_dashboard(self, page):
        """Wait for dashboard to load"""
        dashboard_indicators = ['text=Dashboard', 'text=Conversations', 'text=Opportunities']
        for indicator in dashboard_indicators:
            try:
                await page.wait_for_selector(indicator, timeout=15000)  # Longer timeout for MFA
                print("   ✅ Dashboard loaded")
                return
            except:
                continue
        await page.wait_for_load_state('networkidle', timeout=15000)
    
    async def _trigger_requests(self, page):
        """Trigger requests to capture JWT token"""
        elements = [
            'text=Dashboard', 'text=Conversations', 'text=Opportunities', 
            'text=Contacts', 'text=Marketing', 'nav a'
        ]
        
        for element in elements:
            try:
                await page.click(element, timeout=2000)
                await page.wait_for_timeout(500)
            except:
                continue
        
        # Also try scrolling and refreshing
        try:
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(1000)
            await page.reload(wait_until='networkidle')
            await page.wait_for_timeout(2000)
        except:
            pass
    
    def analyze_jwt_token(self, jwt_token: str):
        """Analyze the JWT token"""
        print(f"\n🔍 STEP 2: TOKEN ANALYSIS")
        print("=" * 30)
        
        try:
            parts = jwt_token.split('.')
            payload = parts[1] + '=' * (4 - len(parts[1]) % 4)
            decoded = json.loads(base64.b64decode(payload))
            
            exp = decoded.get('exp')
            iat = decoded.get('iat')
            now = datetime.now().timestamp()
            
            print(f"✅ Token Details:")
            print(f"   👤 User ID: {decoded.get('user_id')}")
            print(f"   🏢 Company ID: {decoded.get('company_id')}")
            print(f"   📍 Locations: {len(decoded.get('locations', []))} available")
            print(f"   ⏰ Issued: {datetime.fromtimestamp(iat)}")
            print(f"   ⏰ Expires: {datetime.fromtimestamp(exp)}")
            print(f"   ⏰ Valid for: {(exp - iat) / 3600:.1f} hours")
            print(f"   ✅ Status: {'VALID' if now < exp else 'EXPIRED'}")
            
            if now >= exp:
                print("❌ Token expired - this shouldn't happen with fresh extraction!")
                return False
            
            return True
            
        except Exception as e:
            print(f"❌ Error analyzing token: {e}")
            return False
    
    async def test_all_facebook_endpoints(self, jwt_token: str):
        """Test all Facebook endpoints and show results with detailed logging"""
        
        print(f"\n📱 STEP 3: COMPREHENSIVE FACEBOOK INTEGRATION TEST")
        print("=" * 55)
        print("Testing all your Facebook connections with detailed logging...")
        print()
        
        headers = {
            "token-id": jwt_token,
            "channel": "APP",
            "source": "WEB_USER",
            "version": "2021-07-28",
            "accept": "application/json",
            "content-type": "application/json"
        }
        
        print(f"🔧 Request Headers Configuration:")
        print(f"   📋 Token ID: {jwt_token[:30]}...{jwt_token[-10:]}")
        print(f"   📋 Channel: {headers['channel']}")
        print(f"   📋 Source: {headers['source']}")
        print(f"   📋 Version: {headers['version']}")
        print(f"   📋 Location ID: {self.location_id}")
        print()
        
        # Test endpoints in logical order
        endpoints = [
            {
                "name": "Facebook Connection Status",
                "method": "GET",
                "url": f"https://backend.leadconnectorhq.com/integrations/facebook/{self.location_id}/connection",
                "description": "Check if Facebook is connected to GHL"
            },
            {
                "name": "All Available Facebook Pages",
                "method": "GET",
                "url": f"https://backend.leadconnectorhq.com/integrations/facebook/{self.location_id}/allPages?limit=20",
                "description": "Get all Facebook pages from your Facebook account"
            }
        ]
        
        results = {}
        
        all_available_pages = []  # Store for potential attachment
        
        for i, endpoint in enumerate(endpoints, 1):
            print(f"📡 TEST {i}: {endpoint['name'].upper()}")
            print(f"   📝 Purpose: {endpoint['description']}")
            print(f"   🌐 Method: {endpoint['method']}")
            print(f"   🔗 URL: {endpoint['url']}")
            print(f"   ⏳ Sending request...", end="", flush=True)
            
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    if endpoint['method'] == 'GET':
                        response = await client.get(endpoint['url'], headers=headers)
                    else:
                        response = await client.post(endpoint['url'], headers=headers)
                
                print(f" Status: {response.status_code}")
                print(f"   📊 Response Time: ~{response.elapsed.total_seconds():.2f}s")
                print(f"   📏 Content Length: {len(response.content)} bytes")
                
                if response.status_code == 200:
                    print(f"   ✅ SUCCESS")
                    
                    try:
                        data = response.json()
                        results[endpoint['name']] = {
                            'success': True,
                            'data': data,
                            'response_size': len(response.content),
                            'response_time': response.elapsed.total_seconds()
                        }
                        
                        print(f"   📋 Raw JSON Response:")
                        print(f"      {json.dumps(data, indent=6)}")
                        
                        # Detailed analysis for each endpoint
                        if 'connection' in endpoint['url'].lower():
                            print(f"\n   🔍 CONNECTION ANALYSIS:")
                            connected = data.get('connected', False)
                            print(f"      🔗 Status: {'✅ CONNECTED' if connected else '❌ NOT CONNECTED'}")
                            
                            if connected and isinstance(data, dict):
                                print(f"      📊 Connection Details:")
                                for key, value in data.items():
                                    if key != 'connected':
                                        print(f"         {key}: {value}")
                        
                        elif 'allPages' in endpoint['url']:
                            print(f"\n   🔍 ALL AVAILABLE PAGES ANALYSIS:")
                            pages = data.get('pages', data) if isinstance(data, dict) else data
                            
                            if isinstance(pages, list):
                                all_available_pages = pages  # Store for potential attachment
                                print(f"      📄 Total Pages Found: {len(pages)}")
                                
                                if len(pages) > 0:
                                    print(f"      📋 DETAILED PAGE INFORMATION:")
                                    for j, page in enumerate(pages, 1):
                                        print(f"         PAGE {j}:")
                                        for key, value in page.items():
                                            print(f"            {key}: {value}")
                                        print()
                                else:
                                    print(f"      📄 No Facebook pages found in your account")
                            else:
                                print(f"      ⚠️  Unexpected data format: {type(pages)}")
                        
                        elif 'pages?getAll' in endpoint['url']:
                            print(f"\n   🔍 CONNECTED PAGES ANALYSIS:")
                            pages = data.get('pages', data) if isinstance(data, dict) else data
                            
                            if isinstance(pages, list):
                                print(f"      🔗 Pages Connected to GHL: {len(pages)}")
                                
                                if len(pages) > 0:
                                    print(f"      📋 CONNECTED PAGES DETAILS:")
                                    for j, page in enumerate(pages, 1):
                                        print(f"         CONNECTED PAGE {j}:")
                                        for key, value in page.items():
                                            print(f"            {key}: {value}")
                                        print()
                                else:
                                    print(f"      📄 No pages currently connected to GHL")
                                    print(f"      💡 Available for connection below...")
                            else:
                                print(f"      ⚠️  Unexpected data format: {type(pages)}")
                    
                    except json.JSONDecodeError:
                        print(f"   📄 Non-JSON response received")
                        print(f"   📋 Raw content: {response.text[:500]}...")
                        results[endpoint['name']] = {'success': True, 'raw': True}
                
                else:
                    print(f"❌ FAILED ({response.status_code})")
                    print(f"      Error: {response.text[:100]}...")
                    results[endpoint['name']] = {
                        'success': False,
                        'error': response.status_code
                    }
            
            except Exception as e:
                print(f"💥 ERROR: {str(e)[:100]}...")
                results[endpoint['name']] = {
                    'success': False,
                    'error': str(e)
                }
            
            print()  # Add spacing between tests
        
        # Test 3: Attach Facebook pages to GHL
        print(f"📡 TEST 3: ATTACH FACEBOOK PAGES TO GHL")
        print(f"   📝 Purpose: Connect Facebook pages to your GHL location")
        print(f"   🌐 Method: POST")
        
        if all_available_pages:
            attach_url = f"https://backend.leadconnectorhq.com/integrations/facebook/{self.location_id}/pages"
            
            # Prepare the payload from your network capture
            pages_to_attach = []
            for page in all_available_pages:
                pages_to_attach.append({
                    "facebookPageId": page.get("facebookPageId"),
                    "facebookPageName": page.get("facebookPageName"),
                    "facebookIgnoreMessages": page.get("facebookIgnoreMessages", False),
                    "isInstagramAvailable": page.get("isInstagramAvailable", False)
                })
            
            attach_payload = {"pages": pages_to_attach}
            
            print(f"   🔗 URL: {attach_url}")
            print(f"   📋 Payload: {json.dumps(attach_payload, indent=6)}")
            print(f"   ⏳ Sending POST request to attach pages...", end="", flush=True)
            
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        attach_url,
                        headers=headers,
                        json=attach_payload
                    )
                
                print(f" Status: {response.status_code}")
                print(f"   📊 Response Time: ~{response.elapsed.total_seconds():.2f}s")
                print(f"   📏 Content Length: {len(response.content)} bytes")
                
                if response.status_code in [200, 201]:
                    print(f"   ✅ ATTACHMENT SUCCESS")
                    
                    try:
                        data = response.json()
                        results["Attach Facebook Pages"] = {
                            'success': True,
                            'data': data,
                            'response_size': len(response.content),
                            'response_time': response.elapsed.total_seconds()
                        }
                        
                        print(f"   📋 Attachment Response:")
                        print(f"      {json.dumps(data, indent=6)}")
                        
                        print(f"\n   🎉 PAGES SUCCESSFULLY ATTACHED TO GHL!")
                        print(f"   💡 Your Facebook pages are now connected for marketing")
                        
                    except json.JSONDecodeError:
                        print(f"   📄 Non-JSON response: {response.text[:200]}...")
                        results["Attach Facebook Pages"] = {'success': True, 'raw': True}
                
                else:
                    print(f"   ❌ ATTACHMENT FAILED ({response.status_code})")
                    print(f"   📋 Error Response: {response.text[:200]}...")
                    results["Attach Facebook Pages"] = {
                        'success': False,
                        'error': response.status_code,
                        'message': response.text
                    }
                    
            except Exception as e:
                print(f"   💥 ERROR: {str(e)[:100]}...")
                results["Attach Facebook Pages"] = {
                    'success': False,
                    'error': str(e)
                }
        else:
            print(f"   ⚠️  No Facebook pages available to attach")
            results["Attach Facebook Pages"] = {
                'success': False,
                'error': 'No pages available'
            }
        
        print()
        
        # Test 4: Verify pages are now connected
        print(f"📡 TEST 4: VERIFY PAGES ARE NOW CONNECTED")
        print(f"   📝 Purpose: Confirm pages were successfully attached to GHL")
        print(f"   🌐 Method: GET")
        verify_url = f"https://backend.leadconnectorhq.com/integrations/facebook/{self.location_id}/pages?getAll=true"
        print(f"   🔗 URL: {verify_url}")
        print(f"   ⏳ Sending request to verify attachment...", end="", flush=True)
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(verify_url, headers=headers)
            
            print(f" Status: {response.status_code}")
            print(f"   📊 Response Time: ~{response.elapsed.total_seconds():.2f}s")
            print(f"   📏 Content Length: {len(response.content)} bytes")
            
            if response.status_code == 200:
                print(f"   ✅ SUCCESS")
                
                try:
                    data = response.json()
                    results["Verify Connected Pages"] = {
                        'success': True,
                        'data': data,
                        'response_size': len(response.content),
                        'response_time': response.elapsed.total_seconds()
                    }
                    
                    print(f"   📋 Raw JSON Response:")
                    print(f"      {json.dumps(data, indent=6)}")
                    
                    print(f"\n   🔍 CONNECTED PAGES VERIFICATION:")
                    pages = data.get('pages', data) if isinstance(data, dict) else data
                    
                    if isinstance(pages, list):
                        print(f"      🔗 Total Pages Connected to GHL: {len(pages)}")
                        
                        if len(pages) > 0:
                            print(f"      ✅ PAGES NOW CONNECTED:")
                            for j, page in enumerate(pages, 1):
                                print(f"         PAGE {j}:")
                                for key, value in page.items():
                                    print(f"            {key}: {value}")
                                print()
                            print(f"      🎉 Facebook integration complete!")
                        else:
                            print(f"      ❌ No pages showing as connected")
                            print(f"      💡 Check GHL dashboard or try again")
                    else:
                        print(f"      ⚠️  Unexpected data format: {type(pages)}")
                
                except json.JSONDecodeError:
                    print(f"   📄 Non-JSON response: {response.text[:500]}...")
                    results["Verify Connected Pages"] = {'success': True, 'raw': True}
            
            else:
                print(f"   ❌ VERIFICATION FAILED ({response.status_code})")
                print(f"      Error: {response.text[:100]}...")
                results["Verify Connected Pages"] = {
                    'success': False,
                    'error': response.status_code
                }
                
        except Exception as e:
            print(f"   💥 ERROR: {str(e)[:100]}...")
            results["Verify Connected Pages"] = {
                'success': False,
                'error': str(e)
            }
        
        print()
        
        return results
    
    
    def show_final_summary(self, results: dict):
        """Show business user friendly summary"""
        
        print(f"\n🎯 FINAL SUMMARY FOR YOU")
        print("=" * 40)
        
        successful_tests = sum(1 for r in results.values() if r.get('success'))
        total_tests = len(results)
        
        print(f"📊 Test Results: {successful_tests}/{total_tests} successful ({(successful_tests/total_tests)*100:.1f}%)")
        print()
        
        for name, result in results.items():
            status = "✅" if result.get('success') else "❌"
            print(f"{status} {name}")
        
        print()
        
        if successful_tests == total_tests:
            print(f"🎉 CONGRATULATIONS!")
            print(f"✅ Your Facebook integration is working perfectly")
            print(f"✅ All endpoints are accessible")
            print(f"✅ You can see all your Facebook pages")
            
            print(f"\n💡 What you can do now:")
            print(f"   • View all your Facebook pages above")
            print(f"   • Connect more pages in GHL dashboard if needed")
            print(f"   • Use Facebook pages for marketing campaigns")
            print(f"   • Run this script anytime to check status")
            
        elif successful_tests > 0:
            print(f"⚠️  PARTIAL SUCCESS")
            print(f"✅ Some parts of your Facebook integration work")
            print(f"❌ Some tests failed - check Facebook connection in GHL")
            
        else:
            print(f"❌ INTEGRATION ISSUES")
            print(f"💡 Possible solutions:")
            print(f"   • Check Facebook connection in GHL dashboard")
            print(f"   • Reconnect Facebook OAuth if needed")
            print(f"   • Contact support if issues persist")
        
        print(f"\n🚀 ONE-CLICK SOLUTION COMPLETE!")
        print(f"📱 Bookmark this script for easy Facebook page checking")


async def main():
    """One script that does everything automatically"""
    
    viewer = CompleteFacebookViewer()
    
    # Step 1: Welcome & Instructions
    viewer.show_welcome()
    
    # Step 2: Auto extract JWT token
    jwt_token = await viewer.auto_extract_jwt_token()
    
    if not jwt_token:
        print("\n❌ Could not extract access token automatically")
        print("💡 Please ensure you're logged into GHL or try again")
        return
    
    # Step 3: Analyze token
    if not viewer.analyze_jwt_token(jwt_token):
        print("\n❌ Token analysis failed")
        return
    
    # Step 4: Test all Facebook endpoints
    results = await viewer.test_all_facebook_endpoints(jwt_token)
    
    # Step 5: Show business user summary
    viewer.show_final_summary(results)
    
    print(f"\n🎉 ALL DONE!")
    print(f"Thank you for using the Complete Facebook Pages Viewer!")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        print("💡 Please try again or contact support")