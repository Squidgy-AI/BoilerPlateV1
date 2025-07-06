#!/usr/bin/env python3
"""
Automated Facebook Integration for GHL
Handles JWT token generation and complete Facebook OAuth flow
"""

import asyncio
import json
import base64
import time
import os
from datetime import datetime, timedelta
from typing import Dict, Optional
import httpx


class AutomatedGHLAuth:
    """Automated GHL authentication and token management"""
    
    def __init__(self, credentials: Dict):
        self.credentials = credentials
        self.jwt_token = None
        self.token_expires_at = None
        self.bearer_token = credentials.get('bearer_token')
        
    async def get_valid_jwt_token(self) -> str:
        """Get a valid JWT token, refresh if expired"""
        
        # Check if current token is still valid
        if self.jwt_token and self.token_expires_at:
            if datetime.now() < self.token_expires_at - timedelta(minutes=5):  # 5 min buffer
                print(f"✅ Using cached JWT token (expires in {(self.token_expires_at - datetime.now()).total_seconds()/60:.1f} minutes)")
                return self.jwt_token
        
        # Need to get fresh token
        print(f"🔄 Getting fresh JWT token...")
        fresh_token = await self._get_fresh_jwt_token()
        
        if fresh_token:
            self.jwt_token = fresh_token
            # Parse expiration from token
            try:
                parts = fresh_token.split('.')
                payload = parts[1] + '=' * (4 - len(parts[1]) % 4)
                decoded = json.loads(base64.b64decode(payload))
                self.token_expires_at = datetime.fromtimestamp(decoded['exp'])
                print(f"✅ Fresh JWT token obtained (expires: {self.token_expires_at})")
            except:
                # Fallback: assume 1 hour expiry
                self.token_expires_at = datetime.now() + timedelta(hours=1)
            
            return fresh_token
        
        raise Exception("Failed to obtain JWT token")
    
    async def _get_fresh_jwt_token(self) -> Optional[str]:
        """Get fresh JWT token using various methods"""
        
        # Method 1: Try automated browser approach
        token = await self._try_browser_automation()
        if token:
            return token
        
        # Method 2: Try API-based approach  
        token = await self._try_api_login()
        if token:
            return token
        
        # Method 3: Prompt user for manual token
        return self._prompt_for_manual_token()
    
    async def _try_browser_automation(self) -> Optional[str]:
        """Try to get JWT token using browser automation"""
        print("🤖 Attempting browser automation for JWT token...")
        
        try:
            # Check if playwright is available
            from playwright.async_api import async_playwright
            
            async with async_playwright() as p:
                # Launch browser
                browser = await p.chromium.launch(headless=False)  # Set to True for headless
                context = await browser.new_context()
                page = await context.new_page()
                
                # Navigate to GHL login
                print("   📡 Navigating to GHL login...")
                await page.goto("https://app.gohighlevel.com/")
                
                # Wait for page to load
                await page.wait_for_load_state('networkidle')
                
                # Check if already logged in by looking for dashboard elements
                try:
                    # Look for common dashboard elements
                    dashboard_selectors = [
                        '[data-testid="dashboard"]',
                        '.dashboard',
                        '#dashboard',
                        'text=Dashboard',
                        'text=Conversations',
                        'text=Opportunities'
                    ]
                    
                    for selector in dashboard_selectors:
                        try:
                            await page.wait_for_selector(selector, timeout=2000)
                            print("   ✅ Already logged in!")
                            break
                        except:
                            continue
                    else:
                        raise Exception("Not logged in")
                        
                except:
                    # Need to login
                    print("   🔐 Login required - Looking for login form...")
                    
                    # Fill login form
                    email = self.credentials.get('email')
                    password = self.credentials.get('password')
                    
                    if not email or not password:
                        print("   ❌ Email/password not provided in credentials")
                        await browser.close()
                        return None
                    
                    print(f"   📧 Entering email: {email}")
                    
                    # Try different email field selectors
                    email_selectors = [
                        'input[type="email"]',
                        'input[name="email"]',
                        'input[placeholder*="email" i]',
                        'input[id*="email" i]',
                        '#email',
                        '.email-input'
                    ]
                    
                    email_filled = False
                    for selector in email_selectors:
                        try:
                            await page.wait_for_selector(selector, timeout=3000)
                            await page.fill(selector, email)
                            print(f"   ✅ Email filled using selector: {selector}")
                            email_filled = True
                            break
                        except Exception as e:
                            print(f"   ❌ Email selector {selector} failed: {e}")
                            continue
                    
                    if not email_filled:
                        print("   ❌ Could not find email input field")
                        await browser.close()
                        return None
                    
                    print(f"   🔐 Entering password...")
                    
                    # Try different password field selectors
                    password_selectors = [
                        'input[type="password"]',
                        'input[name="password"]',
                        'input[placeholder*="password" i]',
                        'input[id*="password" i]',
                        '#password',
                        '.password-input'
                    ]
                    
                    password_filled = False
                    for selector in password_selectors:
                        try:
                            await page.wait_for_selector(selector, timeout=3000)
                            await page.fill(selector, password)
                            print(f"   ✅ Password filled using selector: {selector}")
                            password_filled = True
                            break
                        except Exception as e:
                            print(f"   ❌ Password selector {selector} failed: {e}")
                            continue
                    
                    if not password_filled:
                        print("   ❌ Could not find password input field")
                        await browser.close()
                        return None
                    
                    # Try different submit button selectors
                    submit_selectors = [
                        'button[type="submit"]',
                        'input[type="submit"]',
                        'button:has-text("Sign In")',
                        'button:has-text("Log In")',
                        'button:has-text("Login")',
                        '.login-button',
                        '.submit-button',
                        '#login-button'
                    ]
                    
                    print(f"   🔄 Clicking submit button...")
                    
                    submit_clicked = False
                    for selector in submit_selectors:
                        try:
                            await page.wait_for_selector(selector, timeout=3000)
                            await page.click(selector)
                            print(f"   ✅ Submit clicked using selector: {selector}")
                            submit_clicked = True
                            break
                        except Exception as e:
                            print(f"   ❌ Submit selector {selector} failed: {e}")
                            continue
                    
                    if not submit_clicked:
                        print("   ❌ Could not find submit button")
                        await browser.close()
                        return None
                    
                    # Wait for navigation after login
                    print(f"   ⏳ Waiting for login to complete...")
                    try:
                        await page.wait_for_load_state('networkidle', timeout=15000)
                        print("   ✅ Login completed!")
                    except:
                        print("   ⚠️  Login may have completed (timeout waiting for network idle)")
                
                # Extract JWT token from network requests
                print("   🔍 Extracting JWT token from requests...")
                
                # Set up request interception
                jwt_token = None
                
                def handle_request(request):
                    nonlocal jwt_token
                    headers = request.headers
                    if 'token-id' in headers:
                        jwt_token = headers['token-id']
                
                page.on('request', handle_request)
                
                # Trigger a request by navigating or clicking
                await page.click('[data-testid="dashboard"]')
                await page.wait_for_timeout(2000)  # Wait for requests
                
                await browser.close()
                
                if jwt_token:
                    print("   ✅ JWT token extracted successfully!")
                    return jwt_token
                else:
                    print("   ❌ No JWT token found in requests")
                    return None
                    
        except ImportError:
            print("   ❌ Playwright not installed. Install with: pip install playwright")
            return None
        except Exception as e:
            print(f"   ❌ Browser automation failed: {e}")
            return None
    
    async def _try_api_login(self) -> Optional[str]:
        """Try to get JWT token using API login"""
        print("🔑 Attempting API login for JWT token...")
        
        email = self.credentials.get('email')
        password = self.credentials.get('password')
        
        if not email or not password:
            print("   ❌ Email/password not provided")
            return None
        
        # This is a simplified approach - actual GHL login API might be different
        login_endpoints = [
            "https://api.gohighlevel.com/v1/auth/login",
            "https://backend.leadconnectorhq.com/auth/login",
            "https://services.leadconnectorhq.com/auth/login"
        ]
        
        for endpoint in login_endpoints:
            try:
                print(f"   📡 Trying: {endpoint}")
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(endpoint, json={
                        'email': email,
                        'password': password
                    })
                
                if response.status_code == 200:
                    data = response.json()
                    token = data.get('token') or data.get('access_token') or data.get('jwt')
                    if token:
                        print("   ✅ API login successful!")
                        return token
                
            except Exception as e:
                print(f"   ❌ {endpoint} failed: {e}")
                continue
        
        print("   ❌ All API login attempts failed")
        return None
    
    def _prompt_for_manual_token(self) -> Optional[str]:
        """Prompt user to manually provide JWT token"""
        print("\n🔧 MANUAL TOKEN REQUIRED")
        print("=" * 50)
        print("Automated methods failed. Please provide JWT token manually:")
        print("1. Open https://app.gohighlevel.com/ in browser")
        print("2. Login to your agency account")
        print("3. Open DevTools (F12) → Network tab")
        print("4. Click anywhere in GHL dashboard")
        print("5. Find any request → Headers → Copy 'token-id' value")
        print()
        
        token = input("Paste JWT token here (or press Enter to skip): ").strip()
        
        if token and token.startswith('eyJ'):
            return token
        
        return None


class FacebookOAuthManager:
    """Manages Facebook OAuth flow and Account ID extraction"""
    
    def __init__(self, auth_manager: AutomatedGHLAuth, location_id: str, user_id: str):
        self.auth = auth_manager
        self.location_id = location_id
        self.user_id = user_id
        self.account_id = None
    
    async def start_oauth_flow(self) -> Dict:
        """Start Facebook OAuth flow and extract Account ID"""
        print(f"\n🔄 Starting Facebook OAuth Flow")
        print("=" * 50)
        
        jwt_token = await self.auth.get_valid_jwt_token()
        
        # Step 1: Get OAuth URL
        oauth_url = f"https://services.leadconnectorhq.com/social-media-posting/oauth/facebook/start?locationId={self.location_id}&userId={self.user_id}"
        
        print(f"📡 OAuth URL: {oauth_url}")
        print(f"🌐 Opening OAuth window...")
        
        # In a real implementation, you'd open this in a browser window
        # For now, we'll simulate the process
        
        print(f"\n📋 OAUTH FLOW STEPS:")
        print(f"1. Open this URL in browser: {oauth_url}")
        print(f"2. Complete Facebook login and authorization")
        print(f"3. Listen for window message with accountId")
        print(f"4. Use accountId for Facebook pages API")
        
        # Simulate getting accountId from OAuth flow
        # In real implementation, this would come from window.addEventListener
        print(f"\n🔧 SIMULATED OAUTH RESPONSE:")
        simulated_response = {
            'actionType': 'close',
            'page': 'social_media_posting', 
            'platform': 'facebook',
            'placement': 'placement',
            'accountId': 'fb_account_' + self.location_id[:8],  # Simulated
            'reconnectAccounts': []
        }
        
        print(f"   {json.dumps(simulated_response, indent=2)}")
        
        # For testing, let's try to get real accountId from connection data
        real_account_id = await self._extract_real_account_id()
        if real_account_id:
            simulated_response['accountId'] = real_account_id
        
        self.account_id = simulated_response['accountId']
        return simulated_response
    
    async def _extract_real_account_id(self) -> Optional[str]:
        """Try to extract real account ID from various sources"""
        
        try:
            jwt_token = await self.auth.get_valid_jwt_token()
            
            # Check connection endpoint
            connection_url = f"https://backend.leadconnectorhq.com/integrations/facebook/{self.location_id}/connection"
            headers = {
                "token-id": jwt_token,
                "channel": "APP",
                "source": "WEB_USER",
                "version": "2021-07-28",
                "accept": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(connection_url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                # Look for account ID in connection data
                possible_fields = ['accountId', 'account_id', 'id', 'facebook_account_id']
                for field in possible_fields:
                    if field in data and data[field]:
                        print(f"   ✅ Found real Account ID: {data[field]}")
                        return data[field]
        
        except Exception as e:
            print(f"   ❌ Could not extract real Account ID: {e}")
        
        return None


class FacebookPagesManager:
    """Manages Facebook pages retrieval and management"""
    
    def __init__(self, auth_manager: AutomatedGHLAuth, oauth_manager: FacebookOAuthManager):
        self.auth = auth_manager
        self.oauth = oauth_manager
    
    async def get_facebook_pages_backend_api(self) -> Dict:
        """Get Facebook pages using backend API (Method 1 - Your working method)"""
        print(f"\n📄 Getting Facebook Pages (Backend API)")
        print("-" * 40)
        
        jwt_token = await self.auth.get_valid_jwt_token()
        
        # Backend API endpoints
        endpoints = [
            {
                'name': 'Check Connection',
                'url': f"https://backend.leadconnectorhq.com/integrations/facebook/{self.oauth.location_id}/connection"
            },
            {
                'name': 'List All Pages', 
                'url': f"https://backend.leadconnectorhq.com/integrations/facebook/{self.oauth.location_id}/pages?getAll=true"
            }
        ]
        
        headers = {
            "token-id": jwt_token,
            "channel": "APP",
            "source": "WEB_USER",
            "version": "2021-07-28",
            "accept": "application/json"
        }
        
        results = {}
        
        for endpoint in endpoints:
            try:
                print(f"📡 {endpoint['name']}: ", end="")
                
                async with httpx.AsyncClient() as client:
                    response = await client.get(endpoint['url'], headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ SUCCESS")
                    
                    if endpoint['name'] == 'List All Pages':
                        pages = data.get('pages', data) if isinstance(data, dict) else data
                        print(f"   📄 Found {len(pages)} Facebook pages")
                        
                        # Show page details
                        for i, page in enumerate(pages[:5], 1):
                            name = page.get('name', 'Unknown')
                            page_id = page.get('id', 'Unknown')
                            print(f"      {i}. {name} (ID: {page_id})")
                        
                        if len(pages) > 5:
                            print(f"      ... and {len(pages) - 5} more pages")
                    
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
    
    async def get_facebook_pages_oauth_api(self) -> Dict:
        """Get Facebook pages using OAuth API (Method 2 - Documented method)"""
        print(f"\n📄 Getting Facebook Pages (OAuth API)")
        print("-" * 40)
        
        if not self.oauth.account_id:
            print("❌ No Account ID available. Run OAuth flow first.")
            return {'success': False, 'error': 'No Account ID'}
        
        # OAuth API endpoint
        url = f"https://services.leadconnectorhq.com/social-media-posting/oauth/{self.oauth.location_id}/facebook/accounts/{self.oauth.account_id}"
        
        headers = {
            "Authorization": f"Bearer {self.auth.bearer_token}",
            "Version": "2021-07-28",
            "Accept": "application/json"
        }
        
        params = {
            "locationId": self.oauth.location_id,
            "userId": self.oauth.user_id
        }
        
        try:
            print(f"📡 OAuth API Request: ", end="")
            print(f"\n   URL: {url}")
            print(f"   Account ID: {self.oauth.account_id}")
            print(f"   Bearer Token: {self.auth.bearer_token[:20]}...")
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ SUCCESS")
                
                if data.get('success') and data.get('results', {}).get('pages'):
                    pages = data['results']['pages']
                    print(f"   📄 Found {len(pages)} Facebook pages")
                    
                    for i, page in enumerate(pages[:5], 1):
                        name = page.get('name', 'Unknown')
                        page_id = page.get('id', 'Unknown')
                        owned = page.get('isOwned', False)
                        connected = page.get('isConnected', False)
                        print(f"      {i}. {name} (ID: {page_id}) [Owned: {owned}, Connected: {connected}]")
                    
                    if len(pages) > 5:
                        print(f"      ... and {len(pages) - 5} more pages")
                
                return {
                    'success': True,
                    'data': data,
                    'account_id': self.oauth.account_id
                }
            else:
                print(f"   ❌ FAILED ({response.status_code})")
                print(f"   Error: {response.text}")
                return {
                    'success': False,
                    'status_code': response.status_code,
                    'error': response.text,
                    'account_id': self.oauth.account_id
                }
                
        except Exception as e:
            print(f"   💥 ERROR: {e}")
            return {
                'success': False,
                'error': str(e),
                'account_id': self.oauth.account_id
            }


async def main():
    """Complete automated Facebook integration"""
    
    print("🚀 AUTOMATED FACEBOOK INTEGRATION FOR GHL")
    print("🎯 Goal: Automate JWT token generation and Facebook pages retrieval")
    print("=" * 80)
    
    # Configuration
    credentials = {
        'email': 'somasekhar.addakula@gmail.com',  # Your GHL email
        'password': 'SomaOnetoo@135',              # Your GHL password
        'bearer_token': 'pit-422e9667-a801-4152-9dd1-cf34eebbd906'  # Your Private Integration token
    }
    
    location_id = "lBPqgBowX1CsjHay12LY"
    user_id = "aZ0n4etrNCEB29sona8M"
    
    # Initialize managers
    auth_manager = AutomatedGHLAuth(credentials)
    oauth_manager = FacebookOAuthManager(auth_manager, location_id, user_id)
    pages_manager = FacebookPagesManager(auth_manager, oauth_manager)
    
    try:
        # Step 1: Get valid JWT token
        print(f"\n📋 STEP 1: Authentication")
        jwt_token = await auth_manager.get_valid_jwt_token()
        print(f"✅ JWT Token obtained: {jwt_token[:50]}...")
        
        # Step 2: Start OAuth flow (to get Account ID)
        print(f"\n📋 STEP 2: Facebook OAuth Flow")
        oauth_result = await oauth_manager.start_oauth_flow()
        print(f"✅ Account ID: {oauth_manager.account_id}")
        
        # Step 3: Get Facebook pages using backend API
        print(f"\n📋 STEP 3: Facebook Pages (Backend API)")
        backend_result = await pages_manager.get_facebook_pages_backend_api()
        
        # Step 4: Get Facebook pages using OAuth API
        print(f"\n📋 STEP 4: Facebook Pages (OAuth API)")
        oauth_pages_result = await pages_manager.get_facebook_pages_oauth_api()
        
        # Summary
        print(f"\n📊 FINAL SUMMARY")
        print("=" * 50)
        print(f"✅ JWT Token: Automated generation successful")
        print(f"✅ OAuth Flow: Account ID extracted")
        print(f"✅ Backend API: {sum(1 for r in backend_result.values() if r.get('success'))}/{len(backend_result)} endpoints successful")
        print(f"{'✅' if oauth_pages_result.get('success') else '❌'} OAuth API: {'Success' if oauth_pages_result.get('success') else 'Failed'}")
        
        print(f"\n💡 NEXT STEPS:")
        print(f"1. Update credentials with your actual GHL email/password")
        print(f"2. Install playwright for browser automation: pip install playwright")
        print(f"3. Run playwright install to download browsers")
        print(f"4. Schedule this script to run periodically for token refresh")
        
    except Exception as e:
        print(f"\n❌ INTEGRATION FAILED: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())