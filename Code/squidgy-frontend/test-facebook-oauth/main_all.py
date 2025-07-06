# Complete Facebook OAuth Integration using GHL Backend APIs
# Reverse engineered from network tab analysis

import json
import re
import urllib.parse
from datetime import datetime
from typing import Dict, Any, List

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Initialize FastAPI app
app = FastAPI(title="Complete Facebook OAuth Integration", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request models
class FacebookOAuthRequest(BaseModel):
    locationId: str
    userId: str

class AttachPagesRequest(BaseModel):
    locationId: str
    pages: List[dict]  # Array of page objects to attach
    token_id: str  # GHL JWT token

# Complete Facebook OAuth Integration Class
class CompleteGHLFacebookIntegration:
    """Complete integration using actual GHL backend APIs"""
    
    def __init__(self):
        self.base_url = "https://backend.leadconnectorhq.com"
        self.oauth_base_url = "https://services.leadconnectorhq.com"
    
    async def extract_oauth_params(self, location_id: str, user_id: str) -> dict:
        """Step 1: Extract OAuth parameters from GHL service"""
        
        ghl_url = f"{self.oauth_base_url}/social-media-posting/oauth/facebook/start?locationId={location_id}&userId={user_id}"
        
        async with httpx.AsyncClient(follow_redirects=False) as client:
            response = await client.get(ghl_url)
            
            if response.status_code not in [301, 302]:
                raise ValueError(f"Expected redirect from GHL service, got {response.status_code}")
            
            redirect_url = response.headers.get('location', '')
            print(f"📍 GHL Service redirected to: {redirect_url}")
            
            if not redirect_url or 'facebook.com' not in redirect_url:
                raise ValueError(f"Invalid redirect URL: {redirect_url}")
            
            params = {}
            
            if 'facebook.com/privacy/consent/gdp' in redirect_url:
                # Extract from GDPR consent page
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
                    if key == 'client_id' or key == 'app_id':
                        params['client_id'] = value[0] if value else None
                        params['app_id'] = value[0] if value else None
                    else:
                        params[key] = value[0] if value else None
            
            # Log what we extracted
            print(f"🔍 Extracted params from redirect URL: {params}")
            
            # Ensure we have a client_id - NO FALLBACKS
            if not params.get('client_id'):
                raise ValueError(f"Failed to extract client_id from redirect URL. Extracted params: {params}")
            
            # Build corrected OAuth URL
            corrected_params = {
                'response_type': 'code',
                'client_id': params.get('client_id'),  # NO FALLBACK
                'redirect_uri': 'https://services.leadconnectorhq.com/integrations/oauth/finish',  # Fixed redirect
                'scope': self._get_complete_scope(),  # Complete scope
                'state': json.dumps({
                    "locationId": location_id,
                    "userId": user_id, 
                    "type": "facebook"
                }),  # Fixed state format
                'logger_id': params.get('logger_id', self._generate_logger_id())
            }
            
            oauth_url = f"https://www.facebook.com/v18.0/dialog/oauth?" + urllib.parse.urlencode(corrected_params)
            
            return {
                'success': True,
                'oauth_url': oauth_url,
                'params': corrected_params,
                'original_redirect': redirect_url
            }
    
    async def check_connection_status(self, location_id: str, token_id: str) -> dict:
        """Step 2: Check if Facebook is already connected"""
        
        url = f"{self.base_url}/integrations/facebook/{location_id}/connection"
        headers = {
            'accept': 'application/json, text/plain, */*',
            'channel': 'APP',
            'source': 'WEB_USER',
            'token-id': token_id,
            'version': '2021-07-28'
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                return {
                    'connected': True,
                    'data': response.json()
                }
            else:
                return {
                    'connected': False,
                    'message': 'Not connected'
                }
    
    async def get_all_facebook_pages(self, location_id: str, token_id: str, limit: int = 20) -> dict:
        """Step 3: Get all available Facebook pages"""
        
        url = f"{self.base_url}/integrations/facebook/{location_id}/allPages"
        params = {'limit': limit}
        headers = {
            'accept': 'application/json, text/plain, */*',
            'channel': 'APP',
            'source': 'WEB_USER', 
            'token-id': token_id,
            'version': '2021-07-28'
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, headers=headers)
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'pages': response.json()
                }
            else:
                raise HTTPException(status_code=response.status_code, detail=f"Failed to get pages: {response.text}")
    
    async def attach_facebook_pages(self, location_id: str, pages: List[dict], token_id: str) -> dict:
        """Step 4: Attach selected Facebook pages to GHL"""
        
        url = f"{self.base_url}/integrations/facebook/{location_id}/pages"
        headers = {
            'accept': 'application/json, text/plain, */*',
            'channel': 'APP',
            'content-type': 'application/json',
            'source': 'WEB_USER',
            'token-id': token_id,
            'version': '2021-07-28'
        }
        
        # Format pages for GHL backend
        formatted_pages = []
        for page in pages:
            formatted_pages.append({
                'id': page.get('id'),
                'name': page.get('name'),
                'picture': page.get('picture', {}).get('data', {}).get('url', ''),
                'access_token': page.get('access_token', ''),
                'category': page.get('category', ''),
                'tasks': page.get('tasks', [])
            })
        
        payload = {
            'pages': formatted_pages
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
            
            if response.status_code in [200, 201]:
                return {
                    'success': True,
                    'attached_pages': response.json(),
                    'count': len(formatted_pages)
                }
            else:
                raise HTTPException(status_code=response.status_code, detail=f"Failed to attach pages: {response.text}")
    
    def _get_complete_scope(self) -> str:
        """Get complete Facebook scope required for full functionality"""
        scopes = [
            'pages_manage_ads',
            'pages_read_engagement',
            'pages_show_list',
            'pages_read_user_content', 
            'pages_manage_metadata',
            'pages_manage_posts',
            'pages_manage_engagement',
            'leads_retrieval',
            'ads_read',
            'pages_messaging',
            'ads_management',
            'instagram_basic',
            'instagram_manage_messages', 
            'instagram_manage_comments',
            'business_management',
            'catalog_management',
            'email',
            'public_profile',
            'read_insights'
        ]
        return ','.join(scopes)
    
    def _generate_logger_id(self) -> str:
        """Generate a UUID for logger_id"""
        import uuid
        return str(uuid.uuid4())

# Initialize integration service
fb_integration = CompleteGHLFacebookIntegration()

# API Endpoints
@app.get("/")
async def root():
    """Health check"""
    return {"message": "Complete Facebook OAuth Integration Server", "status": "ready"}

@app.post("/api/facebook/oauth-url")
async def get_oauth_url(request: FacebookOAuthRequest):
    """Step 1: Get corrected Facebook OAuth URL"""
    try:
        result = await fb_integration.extract_oauth_params(request.locationId, request.userId)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/facebook/connection/{location_id}")
async def check_connection(location_id: str, token_id: str):
    """Step 2: Check Facebook connection status"""
    try:
        result = await fb_integration.check_connection_status(location_id, token_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/facebook/pages/{location_id}")
async def get_facebook_pages(location_id: str, token_id: str, limit: int = 20):
    """Step 3: Get all Facebook pages"""
    try:
        result = await fb_integration.get_all_facebook_pages(location_id, token_id, limit)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/facebook/attach-pages")
async def attach_pages(request: AttachPagesRequest):
    """Step 4: Attach selected Facebook pages"""
    try:
        result = await fb_integration.attach_facebook_pages(
            request.locationId, 
            request.pages, 
            request.token_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/facebook/complete-flow")
async def complete_facebook_flow(request: dict):
    """Complete end-to-end Facebook integration flow"""
    try:
        location_id = request.get('locationId')
        user_id = request.get('userId')
        token_id = request.get('token_id')
        selected_pages = request.get('selectedPages', [])
        
        print(f"🔄 Starting complete Facebook flow for location: {location_id}")
        
        # Step 1: Get OAuth URL
        oauth_result = await fb_integration.extract_oauth_params(location_id, user_id)
        print(f"✅ Step 1: OAuth URL generated")
        
        # Step 2: Check current connection
        connection_status = await fb_integration.check_connection_status(location_id, token_id)
        print(f"✅ Step 2: Connection status checked")
        
        # Step 3: Get pages (if connected)
        pages_result = None
        if connection_status.get('connected'):
            pages_result = await fb_integration.get_all_facebook_pages(location_id, token_id)
            print(f"✅ Step 3: Retrieved {len(pages_result.get('pages', []))} Facebook pages")
        
        # Step 4: Attach pages (if provided)
        attach_result = None
        if selected_pages and connection_status.get('connected'):
            attach_result = await fb_integration.attach_facebook_pages(location_id, selected_pages, token_id)
            print(f"✅ Step 4: Attached {attach_result.get('count', 0)} Facebook pages")
        
        return {
            'success': True,
            'oauth_url': oauth_result.get('oauth_url'),
            'connection_status': connection_status,
            'available_pages': pages_result,
            'attached_pages': attach_result,
            'next_steps': [
                "1. Use oauth_url to authenticate with Facebook",
                "2. After authentication, call /api/facebook/pages to get available pages",
                "3. Select pages and call /api/facebook/attach-pages to complete integration"
            ]
        }
        
    except Exception as e:
        print(f"❌ Complete flow error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Complete Facebook OAuth Integration Server...")
    print("📍 Server: http://localhost:8002")
    print("📋 API docs: http://localhost:8002/docs")
    print("🔗 Complete flow: POST /api/facebook/complete-flow")
    uvicorn.run(app, host="0.0.0.0", port=8002)