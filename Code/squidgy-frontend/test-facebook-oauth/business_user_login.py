#!/usr/bin/env python3
"""
Business User Friendly GHL Login & JWT Extractor
Simple login interface for business users to get JWT tokens automatically
"""

import asyncio
import json
import base64
import time
from datetime import datetime
from typing import Optional
import httpx


class BusinessUserGHLLogin:
    """Simple login interface for business users"""
    
    def __init__(self):
        self.jwt_token = None
        self.location_id = "lBPqgBowX1CsjHay12LY"  # Your main location
    
    def get_user_credentials(self):
        """Get credentials from business user"""
        print("🏢 GOHIGHLEVEL LOGIN")
        print("=" * 40)
        print("Please enter your GoHighLevel credentials:")
        print()
        
        try:
            email = input("📧 Email: ").strip()
            
            # Simple password input (visible for simplicity)
            password = input("🔐 Password: ").strip()
            
            if not email or not password:
                print("❌ Please provide both email and password")
                return None, None
            
            print(f"\n✅ Credentials received for: {email}")
            return email, password
            
        except KeyboardInterrupt:
            print("\n👋 Login cancelled")
            return None, None
        except Exception as e:
            print(f"❌ Error getting credentials: {e}")
            return None, None
    
    async def login_and_get_jwt(self, email: str, password: str) -> Optional[str]:
        """Login to GHL and extract JWT token automatically"""
        
        print(f"\n🔄 Logging into GoHighLevel...")
        print("Please wait while we handle the login process...")
        
        try:
            from playwright.async_api import async_playwright
            
            async with async_playwright() as p:
                # Launch browser (visible so user can see progress)
                print("📱 Opening browser...")
                browser = await p.chromium.launch(
                    headless=False,
                    args=['--start-maximized']
                )
                
                context = await browser.new_context(
                    viewport={'width': 1920, 'height': 1080}
                )
                page = await context.new_page()
                
                # JWT token storage
                jwt_token = None
                request_count = 0
                
                # Intercept requests to capture JWT token
                def handle_request(request):
                    nonlocal jwt_token, request_count
                    request_count += 1
                    
                    headers = request.headers
                    if 'token-id' in headers and headers['token-id'].startswith('eyJ'):
                        jwt_token = headers['token-id']
                        print(f"   ✅ JWT Token captured! (Request #{request_count})")
                
                page.on('request', handle_request)
                
                # Step 1: Navigate to GHL
                print("🌐 Navigating to GoHighLevel...")
                await page.goto("https://app.gohighlevel.com/", wait_until='networkidle')
                
                # Step 2: Check if login is needed
                current_url = page.url
                if 'login' not in current_url.lower():
                    print("✅ Already logged in! Extracting token...")
                    
                    # Trigger some requests to get JWT
                    await self._trigger_requests_for_jwt(page)
                    await page.wait_for_timeout(3000)
                    
                    if jwt_token:
                        await browser.close()
                        return jwt_token
                
                # Step 3: Perform login
                print("🔐 Performing login...")
                await self._perform_login(page, email, password)
                
                # Step 4: Wait for dashboard and extract JWT
                print("⏳ Waiting for dashboard to load...")
                await self._wait_for_dashboard(page)
                
                # Step 5: Trigger requests to capture JWT
                print("🔍 Extracting JWT token...")
                await self._trigger_requests_for_jwt(page)
                
                # Wait a bit more for any delayed requests
                await page.wait_for_timeout(5000)
                
                await browser.close()
                
                if jwt_token:
                    print("✅ Login successful! JWT token extracted.")
                    return jwt_token
                else:
                    print("❌ Could not extract JWT token")
                    return None
                    
        except ImportError:
            print("❌ Browser automation not available")
            print("💡 Please install: pip install playwright")
            return None
        except Exception as e:
            print(f"❌ Login failed: {e}")
            return None
    
    async def _perform_login(self, page, email: str, password: str):
        """Perform the actual login process"""
        
        # Find and fill email field
        email_selectors = [
            'input[type="email"]',
            'input[name="email"]',
            'input[placeholder*="email" i]',
            '#email'
        ]
        
        for selector in email_selectors:
            try:
                await page.wait_for_selector(selector, timeout=3000)
                await page.fill(selector, email)
                print(f"   📧 Email entered")
                break
            except:
                continue
        else:
            raise Exception("Could not find email field")
        
        # Find and fill password field
        password_selectors = [
            'input[type="password"]',
            'input[name="password"]',
            '#password'
        ]
        
        for selector in password_selectors:
            try:
                await page.wait_for_selector(selector, timeout=3000)
                await page.fill(selector, password)
                print(f"   🔐 Password entered")
                break
            except:
                continue
        else:
            raise Exception("Could not find password field")
        
        # Find and click login button
        login_selectors = [
            'button[type="submit"]',
            'button:has-text("Sign In")',
            'button:has-text("Log In")', 
            'button:has-text("Login")',
            'input[type="submit"]'
        ]
        
        for selector in login_selectors:
            try:
                await page.wait_for_selector(selector, timeout=3000)
                await page.click(selector)
                print(f"   🔄 Login button clicked")
                break
            except:
                continue
        else:
            raise Exception("Could not find login button")
    
    async def _wait_for_dashboard(self, page):
        """Wait for dashboard to load after login"""
        
        dashboard_indicators = [
            'text=Dashboard',
            'text=Conversations',
            'text=Opportunities',
            'text=Contacts',
            '[data-testid="dashboard"]',
            '.dashboard'
        ]
        
        # Wait for any dashboard indicator
        for indicator in dashboard_indicators:
            try:
                await page.wait_for_selector(indicator, timeout=5000)
                print(f"   ✅ Dashboard loaded")
                return
            except:
                continue
        
        # If no specific indicators found, wait for URL change
        await page.wait_for_load_state('networkidle', timeout=10000)
    
    async def _trigger_requests_for_jwt(self, page):
        """Trigger various requests to capture JWT token"""
        
        # List of elements to click to trigger requests
        clickable_elements = [
            'text=Dashboard',
            'text=Conversations',
            'text=Opportunities', 
            'text=Contacts',
            'text=Marketing',
            'nav a',
            '.nav-link',
            'button',
            'a[href*="dashboard"]'
        ]
        
        for element in clickable_elements:
            try:
                await page.click(element, timeout=2000)
                await page.wait_for_timeout(1000)
            except:
                continue
        
        # Also try refreshing to trigger requests
        try:
            await page.reload(wait_until='networkidle')
        except:
            pass
    
    def display_jwt_token(self, jwt_token: str):
        """Display JWT token in a user-friendly way"""
        
        print(f"\n🎉 SUCCESS! JWT TOKEN EXTRACTED")
        print("=" * 60)
        
        # Analyze token
        try:
            parts = jwt_token.split('.')
            payload = parts[1] + '=' * (4 - len(parts[1]) % 4)
            decoded = json.loads(base64.b64decode(payload))
            
            exp = decoded.get('exp')
            iat = decoded.get('iat')
            now = datetime.now().timestamp()
            
            print(f"📋 Token Information:")
            print(f"   User ID: {decoded.get('user_id', 'Unknown')}")
            print(f"   Company ID: {decoded.get('company_id', 'Unknown')}")
            print(f"   Role: {decoded.get('role', 'Unknown')}")
            print(f"   Type: {decoded.get('type', 'Unknown')}")
            print(f"   Locations: {len(decoded.get('locations', []))} available")
            print(f"   Issued: {datetime.fromtimestamp(iat)}")
            print(f"   Expires: {datetime.fromtimestamp(exp)}")
            print(f"   Valid for: {(exp - iat) / 3600:.1f} hours")
            print(f"   Status: {'✅ VALID' if now < exp else '❌ EXPIRED'}")
            
        except Exception as e:
            print(f"⚠️  Could not analyze token: {e}")
        
        print(f"\n🔑 Your JWT Token:")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"{jwt_token}")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        
        print(f"\n💡 How to use this token:")
        print(f"   • Copy the token above")
        print(f"   • Use it in your API requests as 'token-id' header")
        print(f"   • Token expires in {(exp - now) / 3600:.1f} hours - get a new one when needed")
        
        print(f"\n📱 Example API Usage:")
        print(f"   headers = {{")
        print(f"       'token-id': 'YOUR_JWT_TOKEN',")
        print(f"       'channel': 'APP',")
        print(f"       'source': 'WEB_USER',")
        print(f"       'version': '2021-07-28'")
        print(f"   }}")
    
    async def test_jwt_token(self, jwt_token: str):
        """Test the JWT token with Facebook APIs"""
        
        print(f"\n🧪 TESTING JWT TOKEN WITH FACEBOOK APIs")
        print("=" * 50)
        
        headers = {
            "token-id": jwt_token,
            "channel": "APP",
            "source": "WEB_USER",
            "version": "2021-07-28",
            "accept": "application/json"
        }
        
        # Test Facebook connection
        print(f"📡 Testing Facebook connection: ", end="")
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://backend.leadconnectorhq.com/integrations/facebook/{self.location_id}/connection",
                    headers=headers
                )
            
            if response.status_code == 200:
                print(f"✅ SUCCESS")
            else:
                print(f"❌ FAILED ({response.status_code})")
                
        except Exception as e:
            print(f"💥 ERROR: {e}")
        
        # Test Facebook pages
        print(f"📄 Testing Facebook pages: ", end="")
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://backend.leadconnectorhq.com/integrations/facebook/{self.location_id}/pages?getAll=true",
                    headers=headers
                )
            
            if response.status_code == 200:
                data = response.json()
                pages = data.get('pages', data) if isinstance(data, dict) else data
                print(f"✅ SUCCESS ({len(pages)} pages found)")
                
                # Show first few pages
                for i, page in enumerate(pages[:3], 1):
                    name = page.get('name', 'Unknown')
                    print(f"      {i}. {name}")
                    
            else:
                print(f"❌ FAILED ({response.status_code})")
                
        except Exception as e:
            print(f"💥 ERROR: {e}")


async def main():
    """Main business user interface"""
    
    print("🚀 GOHIGHLEVEL JWT TOKEN EXTRACTOR")
    print("🎯 For Business Users - Simple & Automatic")
    print("=" * 60)
    print("This tool will:")
    print("✅ Login to your GoHighLevel account")
    print("✅ Extract your JWT token automatically") 
    print("✅ Test it with Facebook integration")
    print("✅ Display the token for your use")
    print()
    
    login_manager = BusinessUserGHLLogin()
    
    # Step 1: Get credentials from user
    email, password = login_manager.get_user_credentials()
    if not email or not password:
        print("❌ Login cancelled")
        return
    
    # Step 2: Login and extract JWT
    print(f"\n🔄 Starting automated login process...")
    jwt_token = await login_manager.login_and_get_jwt(email, password)
    
    if not jwt_token:
        print("❌ Failed to extract JWT token")
        print("💡 Please check your credentials and try again")
        return
    
    # Step 3: Display token to user
    login_manager.display_jwt_token(jwt_token)
    
    # Step 4: Test the token
    await login_manager.test_jwt_token(jwt_token)
    
    print(f"\n🎉 COMPLETE! Your JWT token is ready to use.")
    print(f"💾 Save this token for your Facebook integration needs.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        print("💡 Please try again or contact support")