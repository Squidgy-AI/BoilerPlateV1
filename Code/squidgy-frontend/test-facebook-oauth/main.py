# Facebook OAuth Parameter Extraction Test Server
# Minimal FastAPI server to test Facebook OAuth parameter extraction

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
    """Utility class to extract Facebook OAuth parameters from GHL service"""
    
    @staticmethod
    async def extract_params(location_id: str, user_id: str) -> dict:
        """Extract OAuth parameters from GHL Facebook service"""
        
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
        userId="aZ0n4etrNCEB29sona8M"
    )
    return await extract_facebook_oauth_params(test_request)

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Facebook OAuth Test Server...")
    print("📍 Server will be available at: http://localhost:8001")
    print("🔗 Test endpoint: http://localhost:8001/test")
    print("📋 API docs: http://localhost:8001/docs")
    uvicorn.run(app, host="0.0.0.0", port=8001)