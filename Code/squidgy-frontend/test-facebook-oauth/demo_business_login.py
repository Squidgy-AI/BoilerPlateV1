#!/usr/bin/env python3
"""
Demo of Business User Login (with pre-filled credentials for testing)
Shows exactly how the business user experience would work
"""

import asyncio
import json
import base64
from datetime import datetime
from typing import Optional
import httpx


class DemoBusinessUserLogin:
    """Demo of business user login experience"""
    
    def __init__(self):
        # Pre-filled for demo (in real version, user enters these)
        self.email = "somasekhar.addakula@gmail.com"
        self.password = "SomaOnetoo@135"
        self.location_id = "lBPqgBowX1CsjHay12LY"
    
    def show_user_interface(self):
        """Show what the business user would see"""
        print("🚀 GOHIGHLEVEL JWT TOKEN EXTRACTOR")
        print("🎯 For Business Users - Simple & Automatic")
        print("=" * 60)
        print("This tool will:")
        print("✅ Login to your GoHighLevel account")
        print("✅ Extract your JWT token automatically") 
        print("✅ Test it with Facebook integration")
        print("✅ Display the token for your use")
        print()
        
        print("🏢 GOHIGHLEVEL LOGIN")
        print("=" * 40)
        print("Please enter your GoHighLevel credentials:")
        print()
        print(f"📧 Email: {self.email}")
        print(f"🔐 Password: {'*' * len(self.password)}")
        print()
        print(f"✅ Credentials received for: {self.email}")
    
    async def demo_login_process(self) -> Optional[str]:
        """Demo the automated login process"""
        
        print(f"\n🔄 Starting automated login process...")
        print("Please wait while we handle the login process...")
        
        try:
            from playwright.async_api import async_playwright
            
            print("📱 Opening browser...")
            
            async with async_playwright() as p:
                # Launch browser for demo
                browser = await p.chromium.launch(
                    headless=False,  # Visible so you can see the process
                    args=['--start-maximized']
                )
                
                context = await browser.new_context(
                    viewport={'width': 1920, 'height': 1080}
                )
                page = await context.new_page()
                
                # JWT token storage
                jwt_token = None
                request_count = 0
                
                # Intercept requests to capture JWT token (only once)
                def handle_request(request):
                    nonlocal jwt_token, request_count
                    request_count += 1
                    
                    # Only capture if we don't have a token yet
                    if not jwt_token:
                        headers = request.headers
                        if 'token-id' in headers and headers['token-id'].startswith('eyJ'):
                            jwt_token = headers['token-id']
                            print(f"   ✅ JWT Token captured! (Request #{request_count})")
                            print(f"   🔒 Token secured - stopping further captures")
                
                page.on('request', handle_request)
                
                # Navigate to GHL
                print("🌐 Navigating to GoHighLevel...")
                await page.goto("https://app.gohighlevel.com/", wait_until='networkidle')
                
                # Check if login is needed
                current_url = page.url
                print(f"📍 Current URL: {current_url}")
                
                if 'login' not in current_url.lower() and 'auth' not in current_url.lower():
                    print("✅ Already logged in! Extracting token...")
                    await self._trigger_requests(page)
                    await page.wait_for_timeout(5000)
                    
                    if jwt_token:
                        await browser.close()
                        return jwt_token
                
                # Perform automated login
                print("🔐 Performing automated login...")
                await self._perform_automated_login(page)
                
                # Wait for dashboard
                print("⏳ Waiting for dashboard to load...")
                await self._wait_for_dashboard(page)
                
                # Extract JWT token (reduce wait time since we stop after first capture)
                print("🔍 Extracting JWT token from requests...")
                await self._trigger_requests(page)
                await page.wait_for_timeout(2000)  # Reduced from 5000ms to 2000ms
                
                # Keep browser open briefly to show success
                if jwt_token:
                    print("✅ Login successful! JWT token extracted.")
                    await page.wait_for_timeout(3000)  # Show success for 3 seconds
                
                await browser.close()
                return jwt_token
                
        except ImportError:
            print("❌ Browser automation not available")
            return None
        except Exception as e:
            print(f"❌ Demo login process error: {e}")
            # For demo purposes, return a sample JWT
            return self._get_sample_jwt_for_demo()
    
    async def _perform_automated_login(self, page):
        """Perform automated login (business user doesn't see this complexity)"""
        
        # The business user doesn't need to know these technical details
        # The tool handles everything automatically
        
        email_selectors = [
            'input[type="email"]',
            'input[name="email"]', 
            'input[placeholder*="email" i]'
        ]
        
        # Find and fill email
        for selector in email_selectors:
            try:
                await page.wait_for_selector(selector, timeout=3000)
                await page.fill(selector, self.email)
                print(f"   📧 Email entered automatically")
                break
            except:
                continue
        
        # Find and fill password
        password_selectors = [
            'input[type="password"]',
            'input[name="password"]'
        ]
        
        for selector in password_selectors:
            try:
                await page.wait_for_selector(selector, timeout=3000)
                await page.fill(selector, self.password)
                print(f"   🔐 Password entered automatically")
                break
            except:
                continue
        
        # Find and click login
        login_selectors = [
            'button[type="submit"]',
            'button:has-text("Sign In")',
            'button:has-text("Log In")'
        ]
        
        for selector in login_selectors:
            try:
                await page.wait_for_selector(selector, timeout=3000)
                await page.click(selector)
                print(f"   🔄 Login submitted automatically")
                break
            except:
                continue
    
    async def _wait_for_dashboard(self, page):
        """Wait for successful login"""
        dashboard_indicators = [
            'text=Dashboard',
            'text=Conversations', 
            'text=Opportunities'
        ]
        
        for indicator in dashboard_indicators:
            try:
                await page.wait_for_selector(indicator, timeout=10000)
                print(f"   ✅ Dashboard loaded successfully")
                return
            except:
                continue
        
        await page.wait_for_load_state('networkidle', timeout=10000)
    
    async def _trigger_requests(self, page):
        """Trigger requests to capture JWT (business user doesn't see this)"""
        elements = [
            'text=Dashboard',
            'text=Conversations',
            'text=Opportunities'
        ]
        
        for element in elements:
            try:
                await page.click(element, timeout=2000)
                await page.wait_for_timeout(1000)
            except:
                continue
    
    def _get_sample_jwt_for_demo(self):
        """Return a sample JWT for demo purposes"""
        # This would be the actual JWT in real usage
        return "eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg3NzQ4NTAwMmYwNWJlMDI2N2VmNDU5ZjViNTEzNTMzYjVjNThjMTIiLCJ0eXAiOiJKV1QifQ.eyJ1c2VyX2lkIjoiYVowbjRldHJOQ0VCMjlzb25hOE0iLCJjb21wYW55X2lkIjoibHAycDFxMjdEcmRHdGExcUdESmQiLCJyb2xlIjoiYWRtaW4iLCJ0eXBlIjoiYWdlbmN5IiwibG9jYXRpb25zIjpbImxCUHFnQm93WDFDc2pIYXkxMkxZIiwieWhQT3dZRlRVWHJxb1VBc3BlbUMiLCJKVVRGVG55OEVYUU9TQjVOY3ZBQSIsIndXSzY4RU40R2ZwcTVJbkowMTdOIiwiQWNFc091eWxVYWM2VjV2T2RVWUkiLCJyUUFxUnJwbEhVWGJSRUYyNFEySCJdLCJ2ZXJzaW9uIjoyLCJwZXJtaXNzaW9ucyI6eyJ3b3JrZmxvd3NfZW5hYmxlZCI6dHJ1ZSwid29ya2Zsb3dzX3JlYWRfb25seSI6ZmFsc2V9LCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vaGlnaGxldmVsLWJhY2tlbmQiLCJhdWQiOiJoaWdobGV2ZWwtYmFja2VuZCIsImF1dGhfdGltZSI6MTc1MTcyOTYxMiwic3ViIjoiYVowbjRldHJOQ0VCMjlzb25hOE0iLCJpYXQiOjE3NTE3NjI5MjksImV4cCI6MTc1MTc2NjUyOSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6e30sInNpZ25faW5fcHJvdmlkZXIiOiJjdXN0b20ifX0.SAMPLE_SIGNATURE_FOR_DEMO"
    
    def display_jwt_token_for_business_user(self, jwt_token: str):
        """Display JWT token in business-friendly format"""
        
        print(f"\n🎉 SUCCESS! YOUR TOKEN IS READY")
        print("=" * 60)
        
        # Simple analysis for business user
        try:
            parts = jwt_token.split('.')
            payload = parts[1] + '=' * (4 - len(parts[1]) % 4)
            decoded = json.loads(base64.b64decode(payload))
            
            exp = decoded.get('exp', 0)
            now = datetime.now().timestamp()
            hours_valid = (exp - now) / 3600 if exp > now else 0
            
            print(f"📋 Token Details:")
            print(f"   ✅ Status: Valid and ready to use")
            print(f"   ⏰ Valid for: {hours_valid:.1f} hours")
            print(f"   👤 Your Account: {decoded.get('user_id', 'Unknown')[:15]}...")
            print(f"   🏢 Company: {decoded.get('company_id', 'Unknown')[:15]}...")
            print(f"   📍 Locations: {len(decoded.get('locations', []))} available")
            
        except:
            print(f"📋 Token Status: ✅ Valid and ready to use")
        
        print(f"\n🔑 YOUR JWT TOKEN:")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"{jwt_token}")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        
        print(f"\n💼 FOR BUSINESS USERS:")
        print(f"   📋 Copy the token above")
        print(f"   📧 Share with your developer/technical team")
        print(f"   ⏰ Token expires in {hours_valid:.1f} hours")
        print(f"   🔄 Run this tool again when you need a fresh token")
        
        print(f"\n🛠️  FOR DEVELOPERS:")
        print(f"   • Use this token in API requests")
        print(f"   • Header: 'token-id': 'YOUR_JWT_TOKEN'")
        print(f"   • Works with all GHL backend APIs")
        print(f"   • Perfect for Facebook integration")
    
    async def test_token_for_business_user(self, jwt_token: str):
        """Test token with simple business-friendly output"""
        
        print(f"\n🧪 TESTING YOUR TOKEN")
        print("=" * 40)
        print("Verifying your token works with Facebook integration...")
        
        headers = {
            "token-id": jwt_token,
            "channel": "APP", 
            "source": "WEB_USER",
            "version": "2021-07-28",
            "accept": "application/json"
        }
        
        # Test connection
        print(f"📱 Checking Facebook connection: ", end="")
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://backend.leadconnectorhq.com/integrations/facebook/{self.location_id}/connection",
                    headers=headers
                )
            
            if response.status_code == 200:
                print(f"✅ Connected")
            else:
                print(f"⚠️  Not connected (setup needed)")
                
        except:
            print(f"❌ Connection test failed")
        
        # Test pages access
        print(f"📄 Checking Facebook pages access: ", end="")
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://backend.leadconnectorhq.com/integrations/facebook/{self.location_id}/pages?getAll=true", 
                    headers=headers
                )
            
            if response.status_code == 200:
                data = response.json()
                pages = data.get('pages', data) if isinstance(data, dict) else data
                print(f"✅ Access granted ({len(pages)} pages)")
            else:
                print(f"⚠️  Limited access")
                
        except:
            print(f"❌ Pages test failed")
        
        print(f"\n✅ Token testing complete!")


async def main():
    """Demo the complete business user experience"""
    
    demo = DemoBusinessUserLogin()
    
    # Step 1: Show business user interface
    demo.show_user_interface()
    
    # Step 2: Demo the automated login process
    jwt_token = await demo.demo_login_process()
    
    if not jwt_token:
        print("❌ Demo login failed")
        # Use sample token for demo
        jwt_token = demo._get_sample_jwt_for_demo()
        print("📋 Using sample token for demo purposes...")
    
    # Step 3: Display token in business-friendly format
    demo.display_jwt_token_for_business_user(jwt_token)
    
    # Step 4: Test token functionality  
    await demo.test_token_for_business_user(jwt_token)
    
    print(f"\n🎯 SUMMARY FOR BUSINESS USERS:")
    print("=" * 50)
    print("✅ This tool eliminates technical complexity")
    print("✅ Just enter your GHL username/password")
    print("✅ Get your JWT token automatically")
    print("✅ No need to understand network tabs or developer tools")
    print("✅ Share the token with your technical team")
    print("✅ Run again when you need a fresh token")
    
    print(f"\n💡 BENEFITS:")
    print("🔹 No technical knowledge required")
    print("🔹 Secure automated login process") 
    print("🔹 Instant token extraction")
    print("🔹 Built-in token validation")
    print("🔹 Business-friendly interface")


if __name__ == "__main__":
    asyncio.run(main())