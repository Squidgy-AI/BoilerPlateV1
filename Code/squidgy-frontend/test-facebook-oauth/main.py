#!/usr/bin/env python3
"""
🔐 FACEBOOK OAUTH BACKEND SERVER - WORKS WITH INDEX.HTML
🎯 Python FastAPI server that extracts OAuth params for the frontend

WHAT THIS DOES:
==============
1. 🌐 Runs FastAPI server on http://localhost:8001
2. 📡 Receives requests from index.html JavaScript
3. 🔍 Extracts Facebook OAuth parameters from GHL service (avoids CORS)
4. 📤 Returns parameters to frontend for OAuth flow
5. ✅ Enables the complete OAuth flow in index.html

HOW IT WORKS WITH INDEX.HTML:
============================
1. User opens index.html in browser
2. User clicks "🚀 Start Facebook OAuth" button
3. JavaScript calls this server: POST /api/facebook/extract-oauth-params
4. This server gets OAuth params from GHL service
5. Returns params to JavaScript 
6. JavaScript opens Facebook OAuth with correct params
7. User completes OAuth, gets account data
8. JavaScript fetches Facebook pages and attaches them

HOW TO RUN:
==========
1. Install dependencies:
   pip install fastapi uvicorn httpx

2. Start the server:
   python main.py

3. Open index.html in browser:
   file:///path/to/index.html
   OR
   python -m http.server 8000 (then open http://localhost:8000)

4. Use the web interface:
   - Enter your Bearer Token, Location ID, User ID
   - Click "Start Facebook OAuth"
   - Complete OAuth flow
   - See your Facebook pages and attach them

API ENDPOINTS:
=============
- GET  /          - Health check
- POST /api/facebook/extract-oauth-params - Extract OAuth params 
- GET  /test      - Test extraction with default values
- GET  /docs      - API documentation

CONFIGURATION:
=============
Update the test values around line 200:
- locationId: Your GHL location ID
- userId: Your GHL user ID

TROUBLESHOOTING:
===============
- Server won't start: Check port 8001 is available
- CORS errors: Ensure CORS is enabled (already configured)
- OAuth fails: Check GHL service is accessible
- No params: Verify location ID and user ID are correct

AUTHOR: Claude Code Assistant
VERSION: 1.0 - Facebook OAuth Backend Server
LAST UPDATED: July 2025
"""

# Facebook OAuth Parameter Extraction Test Server
# This server extracts OAuth parameters and works with index.html frontend

import json
import re
import urllib.parse
from datetime import datetime
from typing import Dict, Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Initialize FastAPI app
app = FastAPI(title="Facebook OAuth Test Server", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model
class FacebookOAuthRequest(BaseModel):
    locationId: str
    userId: str

# Facebook OAuth Parameter Extraction Utility
class FacebookOAuthExtractor:
    """
    Utility class to extract Facebook OAuth parameters from GHL service
    
    This class handles the technical complexity of:
    1. Making requests to GHL OAuth service 
    2. Following redirects to Facebook
    3. Parsing OAuth parameters from redirect URLs
    4. Handling different URL formats (GDPR consent vs direct OAuth)
    5. Returning structured parameter data for frontend use
    """
    
    @staticmethod
    async def extract_params(location_id: str, user_id: str) -> dict:
        """
        Extract OAuth parameters from GHL Facebook service
        
        This method:
        1. Calls GHL OAuth start endpoint
        2. Follows redirect to Facebook 
        3. Parses OAuth parameters from redirect URL
        4. Returns structured data for frontend OAuth flow
        
        Args:
            location_id: GHL location ID 
            user_id: GHL user ID
            
        Returns:
            Dict containing OAuth parameters needed for Facebook OAuth flow
        """
        
        ghl_url = f"https://services.leadconnectorhq.com/social-media-posting/oauth/facebook/start?locationId={location_id}&userId={user_id}"
        
        async with httpx.AsyncClient(follow_redirects=False) as client:
            response = await client.get(ghl_url)
            
            if response.status_code not in [301, 302]:
                raise ValueError(f"Expected redirect from GHL service, got {response.status_code}")
            
            redirect_url = response.headers.get('location', '')
            if not redirect_url or 'facebook.com' not in redirect_url:
                raise ValueError(f"Invalid redirect URL: {redirect_url}")
            
            params = {}
            
            if 'facebook.com/privacy/consent/gdp' in redirect_url:
                # Extract from GDPR consent page (URL encoded)
                patterns = {
                    'app_id': r'params%5Bapp_id%5D=(\d+)',
                    'redirect_uri': r'params%5Bredirect_uri%5D=%22([^%]+(?:%[^%]+)*)',
                    'scope': r'params%5Bscope%5D=(%5B[^%]+(?:%[^%]+)*%5D)',
                    'state': r'params%5Bstate%5D=%22([^%]+(?:%[^%]+)*)',
                    'logger_id': r'params%5Blogger_id%5D=%22([^%]+)'
                }
                
                for param, pattern in patterns.items():
                    match = re.search(pattern, redirect_url)
                    if match:
                        value = match.group(1)
                        
                        if param == 'app_id':
                            params['app_id'] = value
                            params['client_id'] = value
                        elif param == 'redirect_uri':
                            params['redirect_uri'] = urllib.parse.unquote(value.replace('\\%2F', '/').replace('\\', ''))
                        elif param == 'scope':
                            try:
                                scope_str = urllib.parse.unquote(value)
                                scope_array = json.loads(scope_str.replace('\\', ''))
                                params['scope'] = ','.join(scope_array)
                            except:
                                params['scope'] = 'email,pages_show_list,pages_read_engagement'
                        elif param == 'state':
                            params['state'] = urllib.parse.unquote(value.replace('\\', ''))
                        elif param == 'logger_id':
                            params['logger_id'] = value
                
                params['response_type'] = 'code'
                
            elif 'facebook.com/dialog/oauth' in redirect_url:
                # Extract from direct OAuth URL
                from urllib.parse import urlparse, parse_qs
                parsed = urlparse(redirect_url)
                query_params = parse_qs(parsed.query)
                
                for key, value in query_params.items():
                    params[key] = value[0] if value else None
            
            return {
                'success': True,
                'params': params,
                'redirect_url': redirect_url,
                'extracted_at': datetime.now().isoformat()
            }

# API Endpoints
@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Facebook OAuth Test Server is running", "status": "healthy"}

@app.post("/api/facebook/extract-oauth-params")
async def extract_facebook_oauth_params(request: FacebookOAuthRequest):
    """
    Extract Facebook OAuth parameters from GHL service without CORS restrictions
    
    Usage:
    POST /api/facebook/extract-oauth-params
    {
        "locationId": "your_location_id",
        "userId": "your_user_id"
    }
    
    Returns:
    {
        "success": true,
        "params": {
            "client_id": "390181264778064",
            "app_id": "390181264778064", 
            "redirect_uri": "https://services.leadconnectorhq.com/social-media-posting/oauth/facebook/finish",
            "scope": "email,pages_show_list,pages_read_engagement,...",
            "state": "locationId,userId,undefined,undefined,...",
            "logger_id": "uuid",
            "response_type": "code"
        },
        "redirect_url": "full_facebook_url",
        "extracted_at": "2025-07-05T16:45:00"
    }
    """
    try:
        print(f"🔍 Extracting Facebook OAuth params for location: {request.locationId}, user: {request.userId}")
        
        result = await FacebookOAuthExtractor.extract_params(request.locationId, request.userId)
        
        print(f"✅ Successfully extracted parameters:")
        print(f"   Client ID: {result['params'].get('client_id', 'NOT_FOUND')}")
        print(f"   Redirect URI: {result['params'].get('redirect_uri', 'NOT_FOUND')}")
        print(f"   Scope: {result['params'].get('scope', 'NOT_FOUND')}")
        
        return result
        
    except ValueError as e:
        print(f"❌ Facebook OAuth extraction error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"💥 Unexpected error in Facebook OAuth extraction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test")
async def test_extraction():
    """Test endpoint with your actual credentials"""
    test_request = FacebookOAuthRequest(
        locationId="lBPqgBowX1CsjHay12LY",
        userId="6ZHPyo1FRlZNBGzH5szG"
    )
    return await extract_facebook_oauth_params(test_request)

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Facebook OAuth Test Server...")
    print("📍 Server will be available at: http://localhost:8001")
    print("🔗 Test endpoint: http://localhost:8001/test")
    print("📋 API docs: http://localhost:8001/docs")
    uvicorn.run(app, host="0.0.0.0", port=8001)