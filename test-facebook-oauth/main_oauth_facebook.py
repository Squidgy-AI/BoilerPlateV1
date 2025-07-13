#!/usr/bin/env python3
"""
🔐 MAIN OAUTH FACEBOOK INTEGRATION SCRIPT
🎯 Complete Facebook OAuth Flow for GoHighLevel Integration

WHAT THIS SCRIPT DOES:
======================
1. 🌐 Starts a local web server to handle OAuth callbacks
2. 🚀 Opens Facebook OAuth window using window.open() method (as per GHL guidance)
3. 📥 Receives OAuth callback with account data via postMessage
4. 📄 Fetches available Facebook pages from the account
5. ✅ Attaches selected pages to your GHL location
6. 📊 Provides complete integration status and verification

WHY USE THIS INSTEAD OF JWT METHOD:
===================================
- ✅ Official OAuth flow as intended by Facebook and GHL
- ✅ Proper permission scopes and long-term access tokens
- ✅ Compliant with Facebook's OAuth policies
- ✅ Works without browser automation or manual token extraction
- ✅ Supports production environments and external applications

HOW TO RUN:
===========
1. Install dependencies:
   pip install aiohttp aiofiles asyncio httpx

2. Update your credentials below (around line 80)

3. Run the script:
   python main_oauth_facebook.py

4. The script will:
   - Start a local server on http://localhost:8000
   - Open Facebook OAuth in a popup window
   - Handle the OAuth callback automatically
   - Show you all your Facebook pages
   - Connect selected pages to GHL

CONFIGURATION REQUIRED:
======================
Update these values in the script (around line 80):
- BEARER_TOKEN: Your GHL Private Integration token
- LOCATION_ID: Your GHL location ID  
- USER_ID: Your GHL user ID

HOW TO GET THESE VALUES:
========================
1. BEARER_TOKEN (Private Integration):
   - Go to GHL Settings → Private Integrations
   - Create new integration with all scopes
   - Copy the token (starts with 'pit-')

2. LOCATION_ID:
   - Login to GHL, look at URL
   - Copy from: app.gohighlevel.com/location/YOUR_LOCATION_ID/dashboard

3. USER_ID:
   - Extract from JWT token or
   - Get from GHL API: GET /users/me

OAUTH FLOW DIAGRAM:
==================
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Your Script   │    │    Facebook      │    │   GHL Server    │
│                 │    │    OAuth         │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │ 1. window.open()       │                        │
         ├───────────────────────►│                        │
         │                        │                        │
         │ 2. User authorizes     │                        │
         │    Facebook permissions│                        │
         │                        │                        │
         │ 3. postMessage with    │                        │
         │    account data        │                        │
         │◄───────────────────────┤                        │
         │                        │                        │
         │ 4. GET /oauth/.../accounts/{accountId}          │
         ├─────────────────────────────────────────────────►│
         │                        │                        │
         │ 5. Returns Facebook pages                       │
         │◄─────────────────────────────────────────────────┤
         │                        │                        │
         │ 6. POST pages to attach                         │
         ├─────────────────────────────────────────────────►│
         │                        │                        │
         │ 7. Pages attached successfully                  │
         │◄─────────────────────────────────────────────────┤

ENDPOINTS USED:
==============
1. OAuth Start: 
   https://services.leadconnectorhq.com/social-media-posting/oauth/facebook/start

2. Get Facebook Pages:
   GET /social-media-posting/oauth/{locationId}/facebook/accounts/{accountId}

3. Attach Pages:
   POST /social-media-posting/oauth/{locationId}/facebook/accounts/{accountId}

TROUBLESHOOTING:
===============
- Popup blocked: Allow popups for localhost in browser settings
- OAuth fails: Check bearer token has correct scopes
- No pages found: Verify Facebook account has pages
- Server errors: Check internet connection and GHL API status

AUTHOR: Claude Code Assistant
VERSION: 1.0 - Complete OAuth Facebook Integration
LAST UPDATED: July 2025
"""

import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Optional
import httpx
from aiohttp import web, ClientSession
import aiofiles
import webbrowser
import os


class GHLFacebookOAuth:
    """
    Complete Facebook OAuth integration for GoHighLevel
    
    This class handles the entire OAuth flow from start to finish:
    1. Starts local web server for OAuth handling
    2. Opens Facebook OAuth window
    3. Receives OAuth callback data
    4. Fetches and attaches Facebook pages
    """
    
    def __init__(self):
        # 🔧 CONFIGURATION - UPDATE THESE VALUES
        # =====================================
        self.bearer_token = "YOUR_BEARER_TOKEN_HERE"  # Private Integration token (pit-...)
        self.location_id = "YOUR_LOCATION_ID_HERE"    # GHL Location ID
        self.user_id = "YOUR_USER_ID_HERE"            # GHL User ID
        
        # OAuth flow variables
        self.oauth_data = None
        self.account_id = None
        self.server = None
        self.server_port = 8000
        
        # GHL API endpoints
        self.base_url = "https://services.leadconnectorhq.com/social-media-posting"
        
        # Headers for GHL API requests
        self.headers = {
            "Authorization": f"Bearer {self.bearer_token}",
            "Version": "2021-07-28",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    
    def validate_configuration(self) -> bool:
        """
        Validate that all required configuration is provided
        
        Returns:
            bool: True if configuration is valid, False otherwise
        """
        print("🔧 VALIDATING CONFIGURATION")
        print("=" * 40)
        
        missing_config = []
        
        if self.bearer_token == "YOUR_BEARER_TOKEN_HERE" or not self.bearer_token:
            missing_config.append("Bearer Token")
        
        if self.location_id == "YOUR_LOCATION_ID_HERE" or not self.location_id:
            missing_config.append("Location ID")
        
        if self.user_id == "YOUR_USER_ID_HERE" or not self.user_id:
            missing_config.append("User ID")
        
        if missing_config:
            print("❌ MISSING CONFIGURATION:")
            for item in missing_config:
                print(f"   • {item}")
            print()
            print("📋 TO FIX THIS:")
            print("1. Open this script in a text editor")
            print("2. Find the __init__ method (around line 80)")
            print("3. Replace the placeholder values with your actual:")
            print("   - Bearer Token (Private Integration token)")
            print("   - Location ID (from GHL URL)")
            print("   - User ID (from JWT or API)")
            print()
            print("💡 See the header comments for detailed instructions")
            return False
        
        print("✅ Configuration valid!")
        print(f"   Bearer Token: {self.bearer_token[:20]}...")
        print(f"   Location ID: {self.location_id}")
        print(f"   User ID: {self.user_id}")
        print()
        return True
    
    async def create_oauth_html(self) -> str:
        """
        Create the HTML page that handles Facebook OAuth
        
        This page:
        1. Opens Facebook OAuth popup using window.open()
        2. Listens for postMessage from OAuth popup
        3. Displays OAuth results and next steps
        
        Returns:
            str: HTML content for OAuth handling page
        """
        html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔐 GHL Facebook OAuth Integration</title>
    <style>
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px; margin: 20px auto; padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; line-height: 1.6;
        }}
        .container {{ 
            background: rgba(255,255,255,0.1); padding: 30px; 
            border-radius: 15px; backdrop-filter: blur(10px);
        }}
        .step {{ 
            background: rgba(255,255,255,0.1); padding: 20px; 
            margin: 15px 0; border-radius: 10px; border-left: 4px solid #4CAF50;
        }}
        button {{ 
            background: #4CAF50; color: white; padding: 15px 30px; 
            border: none; border-radius: 8px; font-size: 16px; 
            cursor: pointer; margin: 10px 5px;
        }}
        button:hover {{ background: #45a049; }}
        button:disabled {{ background: #666; cursor: not-allowed; }}
        .success {{ color: #4CAF50; }}
        .error {{ color: #f44336; }}
        .info {{ color: #2196F3; }}
        .log {{ 
            background: rgba(0,0,0,0.3); padding: 15px; 
            border-radius: 8px; font-family: monospace; 
            max-height: 300px; overflow-y: auto; margin: 15px 0;
        }}
        .hidden {{ display: none; }}
        h1 {{ text-align: center; margin-bottom: 30px; }}
        .emoji {{ font-size: 24px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 GHL Facebook OAuth Integration</h1>
        
        <div class="step">
            <h3>📋 Configuration Status</h3>
            <p><strong>Bearer Token:</strong> {self.bearer_token[:20]}...</p>
            <p><strong>Location ID:</strong> {self.location_id}</p>
            <p><strong>User ID:</strong> {self.user_id}</p>
        </div>
        
        <div class="step">
            <h3>🚀 Step 1: Start Facebook OAuth</h3>
            <p>Click the button below to open Facebook OAuth in a popup window.</p>
            <button id="startOAuth" onclick="startFacebookOAuth()">
                🚀 Start Facebook OAuth
            </button>
            <div id="oauthStatus" class="log hidden"></div>
        </div>
        
        <div class="step hidden" id="step2">
            <h3>📄 Step 2: Facebook Pages Found</h3>
            <p>Great! We found your Facebook pages. Select which ones to connect to GHL:</p>
            <div id="pagesContainer"></div>
            <button id="attachPages" onclick="attachSelectedPages()" disabled>
                ✅ Attach Selected Pages to GHL
            </button>
        </div>
        
        <div class="step hidden" id="step3">
            <h3>🎉 Step 3: Integration Complete</h3>
            <div id="finalResults"></div>
        </div>
        
        <div class="log" id="logContainer">
            <strong>📋 Activity Log:</strong><br>
            Ready to start Facebook OAuth integration...<br>
        </div>
    </div>

    <script>
        // Configuration from Python script
        const config = {{
            baseUrl: '{self.base_url}',
            locationId: '{self.location_id}',
            userId: '{self.user_id}',
            bearerToken: '{self.bearer_token}'
        }};
        
        let oauthData = null;
        let facebookPages = [];
        
        // Logging function
        function log(message, type = 'info') {{
            const logContainer = document.getElementById('logContainer');
            const timestamp = new Date().toLocaleTimeString();
            const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : '📋';
            logContainer.innerHTML += `${{emoji}} [${{timestamp}}] ${{message}}<br>`;
            logContainer.scrollTop = logContainer.scrollHeight;
            console.log(`[${{type.toUpperCase()}}] ${{message}}`);
        }}
        
        // Start Facebook OAuth flow
        function startFacebookOAuth() {{
            log('Starting Facebook OAuth flow...', 'info');
            
            // Construct OAuth URL as per GHL documentation
            const oauthUrl = `${{config.baseUrl}}/oauth/facebook/start?locationId=${{config.locationId}}&userId=${{config.userId}}`;
            
            log(`Opening OAuth window: ${{oauthUrl}}`, 'info');
            
            // Open OAuth popup (as per GHL dev team guidance)
            const popup = window.open(
                oauthUrl,
                'FacebookOAuthWindow',
                'toolbar=no,menubar=no,scrollbars=no,resizable=no,location=no,directories=no,status=no,width=600,height=700'
            );
            
            if (!popup) {{
                log('Popup blocked! Please allow popups for this site and try again.', 'error');
                return;
            }}
            
            // Listen for OAuth completion message
            window.addEventListener('message', handleOAuthMessage, false);
            
            // Update UI
            document.getElementById('startOAuth').disabled = true;
            document.getElementById('startOAuth').innerHTML = '⏳ Waiting for OAuth...';
            document.getElementById('oauthStatus').classList.remove('hidden');
            document.getElementById('oauthStatus').innerHTML = 'OAuth window opened. Please complete Facebook login...';
        }}
        
        // Handle OAuth callback message
        function handleOAuthMessage(event) {{
            log(`Received message from OAuth window: ${{JSON.stringify(event.data)}}`, 'info');
            
            // Validate message structure
            if (event.data && event.data.actionType === 'close' && event.data.platform === 'facebook') {{
                oauthData = event.data;
                
                log('✅ OAuth completed successfully!', 'success');
                log(`Account ID received: ${{oauthData.accountId}}`, 'success');
                
                // Update UI
                document.getElementById('oauthStatus').innerHTML = `
                    <div class="success">
                        ✅ OAuth Success!<br>
                        Account ID: ${{oauthData.accountId}}<br>
                        Platform: ${{oauthData.platform}}<br>
                    </div>
                `;
                
                // Fetch Facebook pages
                fetchFacebookPages(oauthData.accountId);
            }} else {{
                log('Received unexpected message format', 'error');
            }}
        }}
        
        // Fetch Facebook pages from GHL API
        async function fetchFacebookPages(accountId) {{
            log('Fetching Facebook pages from GHL API...', 'info');
            
            try {{
                const response = await fetch(
                    `${{config.baseUrl}}/oauth/${{config.locationId}}/facebook/accounts/${{accountId}}`,
                    {{
                        headers: {{
                            'Authorization': `Bearer ${{config.bearerToken}}`,
                            'Version': '2021-07-28',
                            'Accept': 'application/json'
                        }}
                    }}
                );
                
                if (!response.ok) {{
                    throw new Error(`API request failed: ${{response.status}} ${{response.statusText}}`);
                }}
                
                const data = await response.json();
                log(`API Response: ${{JSON.stringify(data, null, 2)}}`, 'info');
                
                if (data.success && data.results && data.results.pages) {{
                    facebookPages = data.results.pages;
                    displayFacebookPages(facebookPages);
                }} else {{
                    throw new Error('No pages found in API response');
                }}
                
            }} catch (error) {{
                log(`Error fetching Facebook pages: ${{error.message}}`, 'error');
            }}
        }}
        
        // Display Facebook pages for selection
        function displayFacebookPages(pages) {{
            log(`Found ${{pages.length}} Facebook pages`, 'success');
            
            const container = document.getElementById('pagesContainer');
            container.innerHTML = '';
            
            pages.forEach((page, index) => {{
                const pageDiv = document.createElement('div');
                pageDiv.style.cssText = 'border: 1px solid rgba(255,255,255,0.3); padding: 15px; margin: 10px 0; border-radius: 8px;';
                
                pageDiv.innerHTML = `
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" value="${{index}}" style="margin-right: 10px; transform: scale(1.2);">
                        <div>
                            <strong>${{page.name || 'Unknown Page'}}</strong><br>
                            <small>ID: ${{page.id || 'Unknown'}}</small><br>
                            <small>Category: ${{page.category || 'Unknown'}}</small>
                        </div>
                    </label>
                `;
                
                container.appendChild(pageDiv);
            }});
            
            // Show step 2
            document.getElementById('step2').classList.remove('hidden');
            document.getElementById('attachPages').disabled = false;
        }}
        
        // Attach selected pages to GHL
        async function attachSelectedPages() {{
            const checkboxes = document.querySelectorAll('#pagesContainer input[type="checkbox"]:checked');
            
            if (checkboxes.length === 0) {{
                log('Please select at least one page to attach', 'error');
                return;
            }}
            
            const selectedPages = Array.from(checkboxes).map(cb => facebookPages[parseInt(cb.value)]);
            
            log(`Attaching ${{selectedPages.length}} pages to GHL...`, 'info');
            
            try {{
                const response = await fetch(
                    `${{config.baseUrl}}/oauth/${{config.locationId}}/facebook/accounts/${{oauthData.accountId}}`,
                    {{
                        method: 'POST',
                        headers: {{
                            'Authorization': `Bearer ${{config.bearerToken}}`,
                            'Version': '2021-07-28',
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }},
                        body: JSON.stringify({{
                            pages: selectedPages
                        }})
                    }}
                );
                
                if (!response.ok) {{
                    throw new Error(`Attachment failed: ${{response.status}} ${{response.statusText}}`);
                }}
                
                const result = await response.json();
                log(`Attachment response: ${{JSON.stringify(result, null, 2)}}`, 'success');
                
                // Show completion
                showCompletionResults(selectedPages, result);
                
            }} catch (error) {{
                log(`Error attaching pages: ${{error.message}}`, 'error');
            }}
        }}
        
        // Show final completion results
        function showCompletionResults(attachedPages, apiResult) {{
            const resultsDiv = document.getElementById('finalResults');
            
            resultsDiv.innerHTML = `
                <div class="success">
                    <h4>🎉 Integration Completed Successfully!</h4>
                    <p><strong>Pages Attached:</strong> ${{attachedPages.length}}</p>
                    <ul>
                        ${{attachedPages.map(page => `<li>${{page.name}} (ID: ${{page.id}})</li>`).join('')}}
                    </ul>
                    <p><strong>Status:</strong> ✅ Facebook pages are now connected to your GHL location</p>
                    <p><strong>Next Steps:</strong></p>
                    <ul>
                        <li>🎯 Use these pages for social media posting in GHL</li>
                        <li>📊 Monitor engagement and leads from Facebook</li>
                        <li>🔄 Run this script again to add more pages</li>
                    </ul>
                </div>
            `;
            
            document.getElementById('step3').classList.remove('hidden');
            log('🎉 Facebook OAuth integration completed successfully!', 'success');
        }}
    </script>
</body>
</html>
        """
        return html_content
    
    async def start_web_server(self):
        """
        Start local web server to handle OAuth flow
        
        The server serves:
        1. Main OAuth handling page at /
        2. Static files if needed
        3. API endpoints for debugging
        """
        print(f"🌐 STARTING LOCAL WEB SERVER")
        print("=" * 40)
        
        async def handle_root(request):
            """Serve the main OAuth handling page"""
            html_content = await self.create_oauth_html()
            return web.Response(text=html_content, content_type='text/html')
        
        async def handle_health(request):
            """Health check endpoint"""
            return web.json_response({
                'status': 'running',
                'timestamp': datetime.now().isoformat(),
                'config': {
                    'location_id': self.location_id,
                    'user_id': self.user_id,
                    'bearer_token_prefix': self.bearer_token[:10] + '...'
                }
            })
        
        # Create web application
        app = web.Application()
        app.router.add_get('/', handle_root)
        app.router.add_get('/health', handle_health)
        
        # Start server
        runner = web.AppRunner(app)
        await runner.setup()
        
        site = web.TCPSite(runner, 'localhost', self.server_port)
        await site.start()
        
        print(f"✅ Server started at: http://localhost:{self.server_port}")
        print(f"📋 Health check: http://localhost:{self.server_port}/health")
        print()
        
        return runner
    
    async def open_oauth_page(self):
        """
        Open the OAuth handling page in default browser
        """
        oauth_url = f"http://localhost:{self.server_port}"
        print(f"🚀 OPENING OAUTH PAGE")
        print("=" * 30)
        print(f"URL: {oauth_url}")
        print()
        
        # Open in default browser
        webbrowser.open(oauth_url)
        print("✅ OAuth page opened in browser")
        print("💡 Complete the Facebook OAuth flow in the browser window")
        print()
    
    async def monitor_oauth_flow(self):
        """
        Monitor the OAuth flow and provide status updates
        """
        print(f"👀 MONITORING OAUTH FLOW")
        print("=" * 30)
        print("Waiting for OAuth completion...")
        print("(The web interface will handle the actual OAuth flow)")
        print()
        
        # Keep server running and provide periodic status
        try:
            while True:
                await asyncio.sleep(30)  # Check every 30 seconds
                print(f"⏰ [{datetime.now().strftime('%H:%M:%S')}] OAuth server still running...")
                print(f"   URL: http://localhost:{self.server_port}")
                print()
        
        except KeyboardInterrupt:
            print("\n🛑 OAuth monitoring stopped by user")
        
        except Exception as e:
            print(f"\n❌ Error monitoring OAuth: {e}")
    
    async def run_complete_oauth_flow(self):
        """
        Run the complete Facebook OAuth integration flow
        
        This is the main entry point that orchestrates:
        1. Configuration validation
        2. Web server startup
        3. OAuth page opening
        4. Flow monitoring
        """
        print("🚀 GHL FACEBOOK OAUTH INTEGRATION")
        print("=" * 50)
        print("Starting complete OAuth flow...")
        print()
        
        # Step 1: Validate configuration
        if not self.validate_configuration():
            return False
        
        # Step 2: Start web server
        try:
            server_runner = await self.start_web_server()
            
            # Step 3: Open OAuth page
            await self.open_oauth_page()
            
            # Step 4: Monitor flow
            await self.monitor_oauth_flow()
            
        except Exception as e:
            print(f"❌ Error running OAuth flow: {e}")
            return False
        
        finally:
            # Cleanup
            if 'server_runner' in locals():
                await server_runner.cleanup()
                print("🧹 Server cleaned up")
        
        return True


async def main():
    """
    Main entry point for Facebook OAuth integration
    
    Usage:
        python main_oauth_facebook.py
    
    The script will:
    1. Validate your configuration
    2. Start a local web server
    3. Open OAuth page in browser
    4. Guide you through Facebook OAuth
    5. Show results and next steps
    """
    print("🔐 MAIN OAUTH FACEBOOK INTEGRATION")
    print("🎯 Complete Facebook OAuth Flow for GoHighLevel")
    print("=" * 60)
    print()
    
    # Create OAuth handler
    oauth_handler = GHLFacebookOAuth()
    
    # Run complete flow
    success = await oauth_handler.run_complete_oauth_flow()
    
    if success:
        print("🎉 OAuth integration completed successfully!")
    else:
        print("❌ OAuth integration failed - check configuration and try again")
    
    print("\n📋 SUMMARY:")
    print("✅ This script provides the complete Facebook OAuth flow")
    print("✅ Follow the browser interface for step-by-step guidance")
    print("✅ All Facebook pages will be connected to your GHL location")
    print("✅ Use the attached pages for social media posting in GHL")


if __name__ == "__main__":
    """
    Run the script directly
    
    Before running:
    1. Update configuration in GHLFacebookOAuth.__init__()
    2. Install dependencies: pip install aiohttp aiofiles httpx
    3. Run: python main_oauth_facebook.py
    """
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 OAuth integration stopped by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        print("💡 Check your configuration and try again")