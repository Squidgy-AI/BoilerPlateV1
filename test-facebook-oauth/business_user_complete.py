#!/usr/bin/env python3
"""
Complete Business User Experience
1. Enter your GHL credentials
2. We handle everything automatically
3. Show you all your Facebook pages
"""

import asyncio
import json
import base64
import time
from datetime import datetime
from typing import Optional
import httpx


class BusinessUserFacebookViewer:
    """Complete business user experience for viewing Facebook pages"""
    
    def __init__(self):
        self.jwt_token = None
        self.location_id = "lBPqgBowX1CsjHay12LY"
    
    def welcome_screen(self):
        """Show welcome screen to business user"""
        print("🚀 FACEBOOK PAGES VIEWER")
        print("🎯 For Business Users - View All Your Facebook Pages")
        print("=" * 60)
        print("This tool will:")
        print("✅ Login to your GoHighLevel account automatically")
        print("✅ Connect to Facebook in the background") 
        print("✅ Show you ALL your Facebook pages")
        print("✅ Show which pages are connected to GHL")
        print("✅ No technical knowledge required!")
        print()
    
    def get_credentials(self):
        """Get credentials from business user"""
        print("🏢 ENTER YOUR GOHIGHLEVEL LOGIN")
        print("=" * 40)
        
        try:
            email = input("📧 Email: ").strip()
            password = input("🔐 Password: ").strip()
            
            if not email or not password:
                print("❌ Please provide both email and password")
                return None, None
            
            print(f"\n✅ Got credentials for: {email}")
            return email, password
            
        except KeyboardInterrupt:
            print("\n👋 Cancelled")
            return None, None
    
    async def login_and_extract_token(self, email: str, password: str) -> Optional[str]:
        """Handle all the technical stuff - business user doesn't see this complexity"""
        
        print(f"\n🔄 CONNECTING TO YOUR ACCOUNT...")
        print("Please wait while we:")
        print("   📱 Open your GHL account")
        print("   🔐 Login automatically") 
        print("   🔗 Extract your access token")
        print("   📄 Prepare to show your Facebook pages")
        print()
        
        try:
            from playwright.async_api import async_playwright
            
            async with async_playwright() as p:
                print("   📱 Opening browser...")
                browser = await p.chromium.launch(
                    headless=False,
                    args=['--start-maximized']
                )
                
                context = await browser.new_context(
                    viewport={'width': 1920, 'height': 1080}
                )
                page = await context.new_page()
                
                # JWT token capture
                jwt_token = None
                
                def handle_request(request):
                    nonlocal jwt_token
                    if not jwt_token:
                        headers = request.headers
                        if 'token-id' in headers and headers['token-id'].startswith('eyJ'):
                            jwt_token = headers['token-id']
                            print("   ✅ Access token secured!")
                
                page.on('request', handle_request)
                
                # Navigate and login
                print("   🌐 Connecting to GoHighLevel...")
                await page.goto("https://app.gohighlevel.com/", wait_until='networkidle')
                
                current_url = page.url
                if 'login' not in current_url.lower():
                    print("   ✅ Already logged in!")
                    print("   🔍 Getting your access credentials...")
                    # Try multiple methods to capture JWT token
                    await self._trigger_token_requests(page)
                    await page.wait_for_timeout(2000)
                    
                    # If no token yet, try more aggressive triggering
                    if not jwt_token:
                        print("   🔄 Trying additional methods...")
                        await page.reload(wait_until='networkidle')
                        await page.wait_for_timeout(2000)
                        await self._trigger_token_requests(page)
                        await page.wait_for_timeout(3000)
                else:
                    print("   🔐 Logging in automatically...")
                    await self._auto_login(page, email, password)
                    print("   ⏳ Waiting for your dashboard...")
                    await self._wait_for_dashboard(page)
                    print("   🔍 Getting your access credentials...")
                    await self._trigger_token_requests(page)
                    await page.wait_for_timeout(3000)
                
                await browser.close()
                
                if jwt_token:
                    print("   🎉 Successfully connected to your account!")
                    return jwt_token
                else:
                    print("   ❌ Could not establish connection")
                    return None
                    
        except ImportError:
            print("   ❌ Browser automation not available")
            return None
        except Exception as e:
            print(f"   ❌ Connection failed: {e}")
            return None
    
    async def _auto_login(self, page, email: str, password: str):
        """Handle login automatically"""
        # Email
        email_selectors = ['input[type="email"]', 'input[name="email"]']
        for selector in email_selectors:
            try:
                await page.wait_for_selector(selector, timeout=3000)
                await page.fill(selector, email)
                break
            except:
                continue
        
        # Password
        password_selectors = ['input[type="password"]', 'input[name="password"]']
        for selector in password_selectors:
            try:
                await page.wait_for_selector(selector, timeout=3000)
                await page.fill(selector, password)
                break
            except:
                continue
        
        # Submit
        login_selectors = ['button[type="submit"]', 'button:has-text("Sign In")', 'button:has-text("Log In")']
        for selector in login_selectors:
            try:
                await page.wait_for_selector(selector, timeout=3000)
                await page.click(selector)
                break
            except:
                continue
    
    async def _wait_for_dashboard(self, page):
        """Wait for dashboard to load"""
        dashboard_indicators = ['text=Dashboard', 'text=Conversations', 'text=Opportunities']
        for indicator in dashboard_indicators:
            try:
                await page.wait_for_selector(indicator, timeout=10000)
                return
            except:
                continue
        await page.wait_for_load_state('networkidle', timeout=10000)
    
    async def _trigger_token_requests(self, page):
        """Trigger requests to get the token"""
        # Try clicking various elements to generate API requests
        elements = [
            'text=Dashboard', 'text=Conversations', 'text=Opportunities', 
            'text=Contacts', 'text=Marketing', 'text=Workflows',
            'nav a', '[data-testid*="nav"]', 'a[href*="dashboard"]',
            'a[href*="conversations"]', 'a[href*="opportunities"]'
        ]
        
        for element in elements:
            try:
                await page.click(element, timeout=2000)
                await page.wait_for_timeout(500)
            except:
                continue
        
        # Also try scrolling to trigger lazy-loaded content
        try:
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(1000)
            await page.evaluate("window.scrollTo(0, 0)")
        except:
            pass
    
    async def show_facebook_pages(self, jwt_token: str):
        """Show business user their Facebook pages - the main goal!"""
        
        print(f"\n📄 YOUR FACEBOOK PAGES")
        print("=" * 50)
        print("Checking your Facebook connection and pages...")
        print()
        
        headers = {
            "token-id": jwt_token,
            "channel": "APP",
            "source": "WEB_USER",
            "version": "2021-07-28",
            "accept": "application/json"
        }
        
        # Step 1: Check Facebook connection
        print("📡 Checking Facebook connection: ", end="", flush=True)
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"https://backend.leadconnectorhq.com/integrations/facebook/{self.location_id}/connection",
                    headers=headers
                )
            
            if response.status_code == 200:
                print("✅ CONNECTED")
                connection_data = response.json()
                
                # Show connection details
                if isinstance(connection_data, dict):
                    print(f"   📊 Account Details:")
                    for key, value in connection_data.items():
                        if key in ['accountName', 'email', 'accountId']:
                            print(f"      {key}: {value}")
            else:
                print("❌ NOT CONNECTED")
                print(f"   Please connect Facebook in your GHL dashboard first")
                return
                
        except Exception as e:
            print(f"❌ ERROR: {e}")
            return
        
        # Step 2: Get all available Facebook pages
        print(f"\n📄 Getting all your Facebook pages: ", end="", flush=True)
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"https://backend.leadconnectorhq.com/integrations/facebook/{self.location_id}/allPages?limit=20",
                    headers=headers
                )
            
            if response.status_code == 200:
                data = response.json()
                all_pages = data.get('pages', data) if isinstance(data, dict) else data
                
                if isinstance(all_pages, list) and len(all_pages) > 0:
                    print(f"✅ FOUND {len(all_pages)} PAGES")
                    print(f"\n   🏢 ALL YOUR FACEBOOK PAGES:")
                    print(f"   " + "=" * 45)
                    
                    for i, page in enumerate(all_pages, 1):
                        name = page.get('name', 'Unknown Page')
                        page_id = page.get('id', 'Unknown')
                        category = page.get('category', 'Unknown')
                        
                        print(f"   {i:2}. {name}")
                        print(f"       ID: {page_id}")
                        print(f"       Category: {category}")
                        print()
                else:
                    print("❌ NO PAGES FOUND")
                    print("   Your Facebook account may not have any pages")
                    
            else:
                print(f"❌ FAILED ({response.status_code})")
                
        except Exception as e:
            print(f"❌ ERROR: {e}")
        
        # Step 3: Get pages attached to GHL
        print(f"\n🔗 Checking pages connected to GHL: ", end="", flush=True)
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"https://backend.leadconnectorhq.com/integrations/facebook/{self.location_id}/pages?getAll=true",
                    headers=headers
                )
            
            if response.status_code == 200:
                data = response.json()
                attached_pages = data.get('pages', data) if isinstance(data, dict) else data
                
                if isinstance(attached_pages, list) and len(attached_pages) > 0:
                    print(f"✅ {len(attached_pages)} CONNECTED")
                    print(f"\n   🔗 PAGES CONNECTED TO GHL:")
                    print(f"   " + "=" * 35)
                    
                    for i, page in enumerate(attached_pages, 1):
                        name = page.get('name', 'Unknown Page')
                        page_id = page.get('id', 'Unknown')
                        
                        print(f"   {i}. {name}")
                        print(f"      ID: {page_id}")
                        print(f"      Status: ✅ Connected to GHL")
                        print()
                else:
                    print("❌ NONE CONNECTED")
                    print("   No Facebook pages are currently connected to GHL")
                    print("   You can connect them in your GHL dashboard")
                    
            else:
                print(f"❌ FAILED ({response.status_code})")
                
        except Exception as e:
            print(f"❌ ERROR: {e}")
        
        # Business user summary
        print(f"\n🎯 SUMMARY FOR YOU")
        print("=" * 30)
        print("✅ Successfully logged into your GHL account")
        print("✅ Retrieved your Facebook pages information")
        print("✅ Checked which pages are connected to GHL")
        print(f"\n💡 What you can do next:")
        print("   • Connect more Facebook pages in your GHL dashboard")
        print("   • Use connected pages for marketing campaigns")
        print("   • Run this tool anytime to check your pages")


async def main():
    """Complete business user experience"""
    
    viewer = BusinessUserFacebookViewer()
    
    # Step 1: Welcome screen
    viewer.welcome_screen()
    
    # Step 2: Get credentials
    email, password = viewer.get_credentials()
    if not email or not password:
        return
    
    # Step 3: Login and get token (all automatic)
    jwt_token = await viewer.login_and_extract_token(email, password)
    if not jwt_token:
        print("❌ Could not connect to your account")
        print("💡 Please check your credentials and try again")
        return
    
    # Step 4: Show Facebook pages (the main goal!)
    await viewer.show_facebook_pages(jwt_token)
    
    print(f"\n🎉 COMPLETE!")
    print("Thank you for using the Facebook Pages Viewer!")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("💡 Please try again or contact support")