# How to Create GoHighLevel Tokens & JWT

## Two Types of Tokens You Need

### 1. Firebase JWT Token (for Internal APIs) ✅ 
**What you currently have and it works perfectly!**

### 2. OAuth Access Token (for Public APIs) 
**What we need for `/oauth/locationToken`**

---

## Method 1: Get Firebase JWT Token (Current Working Method)

### Steps:
1. **Login to GHL Dashboard**
2. **Open Browser DevTools** (F12)
3. **Go to Network Tab**
4. **Make any action in GHL** (click around)
5. **Find any request** → Headers → Copy `token-id` value

### Example Result:
```
token-id: eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg3NzQ4NTAwMmYwNWJlMDI2N2VmNDU5ZjViNTEzNTMzYjVjNThjMTIiLCJ0eXAiOiJKV1QifQ...
```

### ✅ **This works with:**
- ✅ Facebook integration APIs (`backend.leadconnectorhq.com`)
- ✅ All internal GHL APIs
- ✅ Multi-location access (all sub-accounts)

### ❌ **This doesn't work with:**
- ❌ Public OAuth APIs (`services.leadconnectorhq.com/oauth/*`)

---

## Method 2: Create Private Integration Token

### Steps to Create Private Integration:

#### **For Agency Level:**
1. **Go to GHL Agency Settings** 
2. **Click "Private Integrations"**
3. **Click "Create Private Integration"**
4. **Fill out form:**
   - **Name**: "Facebook Integration API"
   - **Description**: "For Facebook page management"
   - **Scopes**: Select ALL these scopes:
     ```
     ☑️ oauth.readonly
     ☑️ oauth.write  
     ☑️ locations.readonly
     ☑️ locations.write
     ☑️ conversations/message.readonly
     ☑️ conversations/message.write
     ☑️ workflows.readonly
     ☑️ workflows.write
     ☑️ contacts.readonly
     ☑️ contacts.write
     ☑️ calendars.readonly
     ☑️ calendars.write
     ☑️ businesses.readonly
     ☑️ businesses.write
     ☑️ users.readonly
     ☑️ users.write
     ☑️ opportunities.readonly
     ☑️ opportunities.write
     ☑️ forms.readonly
     ☑️ forms.write
     ☑️ snapshots.readonly
     ☑️ products.readonly
     ☑️ products.write
     ☑️ memberships.readonly
     ☑️ memberships.write
     ☑️ marketplaces.readonly
     ☑️ marketplaces.write
     ☑️ saas.readonly
     ☑️ saas.write
     ```
5. **Click "Create"**
6. **Copy the generated token** (starts with `pit-`)

#### **For Sub-Account Level:**
1. **Switch to specific sub-account** (Nestle, KitKat, etc.)
2. **Go to Settings → Private Integrations**
3. **Repeat same process**
4. **Select same scopes**

---

## Method 3: Extract JWT from Different GHL Pages

### Different ways to get JWT tokens:

#### **Agency Level JWT:**
```bash
# Login to agency dashboard
# Go to: https://app.gohighlevel.com/
# DevTools → Network → Copy token-id from any request
```

#### **Sub-Account Level JWT:**
```bash
# Switch to specific sub-account
# Go to: https://app.gohighlevel.com/location/LOCATION_ID
# DevTools → Network → Copy token-id from any request
```

#### **Different JWT for Different Actions:**
```bash
# Some JWTs have different permissions based on where you get them:

# 1. Main Dashboard JWT
https://app.gohighlevel.com/

# 2. Conversations JWT  
https://app.gohighlevel.com/location/LOCATION_ID/conversations

# 3. Social Media JWT
https://app.gohighlevel.com/location/LOCATION_ID/marketing/social-media-posting

# 4. Integration Settings JWT
https://app.gohighlevel.com/location/LOCATION_ID/settings/integrations
```

---

## Method 4: OAuth App Creation (Advanced)

### For Full OAuth Access:

1. **Go to GHL Developer Portal**
   - https://marketplace.gohighlevel.com/
   
2. **Create New App**
   - App Type: "Private App" or "Public App"
   - Scopes: Select all required OAuth scopes
   
3. **Get OAuth Credentials**
   - Client ID
   - Client Secret
   - Redirect URL
   
4. **Implement OAuth Flow**
   ```bash
   # Authorization URL
   https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&redirect_uri=YOUR_REDIRECT&client_id=YOUR_CLIENT_ID&scope=SCOPES
   
   # Token Exchange
   POST https://services.leadconnectorhq.com/oauth/token
   ```

---

## Current Issue Diagnosis

### Why Your Private Integration Tokens Fail:

```
Error: "The token is not authorized for this scope."
```

**Possible reasons:**
1. **Missing OAuth Scopes** - Private Integration doesn't have `oauth.write` scope
2. **Wrong Token Type** - Need OAuth access token, not Private Integration token
3. **Company/Location Mismatch** - Token created for wrong company ID
4. **API Endpoint Restriction** - `/oauth/locationToken` might only work with full OAuth apps

---

## Recommended Solution 

### **Stick with Firebase JWT Method** ✅

**Why?**
1. ✅ **Already working** with Facebook APIs
2. ✅ **Simpler** - no OAuth setup needed  
3. ✅ **Multi-location** - works across all sub-accounts
4. ✅ **Proven** - same tokens GHL UI uses

**Your current approach is perfect for Facebook integration!**

### **Only Use OAuth Tokens If:**
- Building public marketplace app
- Need specific OAuth compliance
- Required by external integrations

---

## Test Script to Get All Token Types

```python
#!/usr/bin/env python3
"""
Complete token extraction and testing script
"""

import asyncio
import json
import base64
import httpx

class GHLTokenExtractor:
    def __init__(self):
        self.tokens = {
            'firebase_jwt': None,
            'private_integration': None,
            'oauth_access': None
        }
    
    def analyze_token(self, token, token_type):
        """Analyze any JWT token"""
        try:
            if token.startswith('pit-'):
                print(f"{token_type}: Private Integration Token")
                return
            
            parts = token.split('.')
            if len(parts) != 3:
                print(f"{token_type}: Not a JWT token")
                return
                
            payload = parts[1]
            payload += '=' * (4 - len(payload) % 4)
            decoded = json.loads(base64.b64decode(payload))
            
            print(f"\n{token_type} Analysis:")
            print("-" * 30)
            print(f"Issuer: {decoded.get('iss', 'N/A')}")
            print(f"Type: {decoded.get('type', 'N/A')}")
            print(f"Role: {decoded.get('role', 'N/A')}")
            print(f"Company ID: {decoded.get('company_id', 'N/A')}")
            print(f"User ID: {decoded.get('user_id', 'N/A')}")
            print(f"Locations: {len(decoded.get('locations', []))} total")
            
        except Exception as e:
            print(f"Error analyzing {token_type}: {e}")
    
    async def test_token_with_facebook_api(self, token, token_type, location_id):
        """Test token with Facebook API"""
        
        # Try different authentication methods
        test_methods = [
            {
                'name': 'Firebase JWT (token-id)',
                'headers': {
                    'token-id': token,
                    'channel': 'APP',
                    'source': 'WEB_USER',
                    'version': '2021-07-28'
                }
            },
            {
                'name': 'OAuth Bearer',
                'headers': {
                    'Authorization': f'Bearer {token}',
                    'Version': '2021-07-28'
                }
            }
        ]
        
        facebook_url = f"https://backend.leadconnectorhq.com/integrations/facebook/{location_id}/connection"
        
        for method in test_methods:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(facebook_url, headers=method['headers'])
                    
                print(f"\n{token_type} with {method['name']}: {response.status_code}")
                if response.status_code == 200:
                    print("✅ SUCCESS - Token works with Facebook API!")
                    return True
                else:
                    print(f"❌ FAILED - {response.status_code}")
                    
            except Exception as e:
                print(f"❌ ERROR - {str(e)}")
        
        return False

# Usage
async def main():
    extractor = GHLTokenExtractor()
    
    # Test your tokens
    firebase_jwt = "eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg3NzQ4NTAwMmYwNWJlMDI2N2VmNDU5ZjViNTEzNTMzYjVjNThjMTIiLCJ0eXAiOiJKV1QifQ.eyJ1c2VyX2lkIjoiYVowbjRldHJOQ0VCMjlzb25hOE0iLCJjb21wYW55X2lkIjoibHAycDFxMjdEcmRHdGExcUdESmQiLCJyb2xlIjoiYWRtaW4iLCJ0eXBlIjoiYWdlbmN5IiwibG9jYXRpb25zIjpbImxCUHFnQm93WDFDc2pIYXkxMkxZIiwieWhQT3dZRlRVWHJxb1VBc3BlbUMiLCJKVVRGVG55OEVYUU9TQjVOY3ZBQSIsIndXSzY4RU40R2ZwcTVJbkowMTdOIiwiQWNFc091eWxVYWM2VjV2T2RVWUkiLCJyUUFxUnJwbEhVWGJSRUYyNFEySCJdLCJ2ZXJzaW9uIjoyLCJwZXJtaXNzaW9ucyI6eyJ3b3JrZmxvd3NfZW5hYmxlZCI6dHJ1ZSwid29ya2Zsb3dzX3JlYWRfb25seSI6ZmFsc2V9LCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vaGlnaGxldmVsLWJhY2tlbmQiLCJhdWQiOiJoaWdobGV2ZWwtYmFja2VuZCIsImF1dGhfdGltZSI6MTc1MTcyOTYxMiwic3ViIjoiYVowbjRldHJOQ0VCMjlzb25hOE0iLCJpYXQiOjE3NTE3NDc4NDIsImV4cCI6MTc1MTc1MTQ0MiwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6e30sInNpZ25faW5fcHJvdmlkZXIiOiJjdXN0b20ifX0.GmrkxQBn1T38f4DPU-A2M-aqtu5qVvBxyFi5IZr7MBdv-3Exl-ldOSCVR7dvFkm7ybcfFlfGeVlx9_4M9SpX_6MjaYXTAoHnBoiaxLRtT-RUyO1hUphel6duvrsGj5tmvlZuGz0-VIkdweaPUQlVUvn9xEdX8mmo2b6-7ajyEues_eVyKdkVymn5axcnIQr9zhoq5BtzOnTJ4W_6-fGq5-4jvaYrbZCBGQkhrRaOmKYT8cmckiBELEjGBVX4RRyIL88cwqZj95ztnrxzg1naYlkU0NxMw5-OvmQ_wMtGU7kwqUyxI0BV7n4eMdeePE6m9qYPy5Ct8xsDBGytPws45w"
    private_integration = "pit-e3d8d384-00cb-4744-8213-b1ab06ae71fe"
    location_id = "lBPqgBowX1CsjHay12LY"
    
    # Analyze tokens
    extractor.analyze_token(firebase_jwt, "Firebase JWT")
    extractor.analyze_token(private_integration, "Private Integration")
    
    # Test with Facebook API
    await extractor.test_token_with_facebook_api(firebase_jwt, "Firebase JWT", location_id)
    await extractor.test_token_with_facebook_api(private_integration, "Private Integration", location_id)

if __name__ == "__main__":
    asyncio.run(main())
```

Save this as `token_analyzer.py` and run it to understand all your token types!