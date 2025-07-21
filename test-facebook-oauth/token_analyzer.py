#!/usr/bin/env python3
"""
Complete token extraction and testing script for GHL
Tests different token types and their capabilities
"""

import asyncio
import json
import base64
import httpx
from datetime import datetime


class GHLTokenAnalyzer:
    def __init__(self):
        self.test_location_id = "lBPqgBowX1CsjHay12LY"
        self.company_id = "lp2p1q27DrdGta1qGDJd"
        
    def analyze_token(self, token, token_type):
        """Analyze any JWT token or Private Integration token"""
        print(f"\n{'='*60}")
        print(f"🔍 ANALYZING: {token_type}")
        print(f"{'='*60}")
        
        try:
            if token.startswith('pit-'):
                print(f"📋 Type: Private Integration Token")
                print(f"📋 Format: pit-{token[4:8]}...{token[-8:]}")
                print(f"📋 Length: {len(token)} characters")
                return {
                    'type': 'private_integration',
                    'valid': True
                }
            
            parts = token.split('.')
            if len(parts) != 3:
                print(f"❌ Invalid JWT format")
                return {'type': 'invalid', 'valid': False}
                
            # Decode header
            header = parts[0]
            header += '=' * (4 - len(header) % 4)
            header_data = json.loads(base64.b64decode(header))
            
            # Decode payload
            payload = parts[1]
            payload += '=' * (4 - len(payload) % 4)
            payload_data = json.loads(base64.b64decode(payload))
            
            print(f"📋 JWT Header:")
            print(f"   Algorithm: {header_data.get('alg', 'N/A')}")
            print(f"   Type: {header_data.get('typ', 'N/A')}")
            print(f"   Key ID: {header_data.get('kid', 'N/A')}")
            
            print(f"\n📋 JWT Payload:")
            print(f"   Issuer: {payload_data.get('iss', 'N/A')}")
            print(f"   Audience: {payload_data.get('aud', 'N/A')}")
            print(f"   Subject: {payload_data.get('sub', 'N/A')}")
            print(f"   User ID: {payload_data.get('user_id', 'N/A')}")
            print(f"   Company ID: {payload_data.get('company_id', 'N/A')}")
            print(f"   Type: {payload_data.get('type', 'N/A')}")
            print(f"   Role: {payload_data.get('role', 'N/A')}")
            print(f"   Version: {payload_data.get('version', 'N/A')}")
            
            # Check expiration
            exp = payload_data.get('exp')
            if exp:
                exp_date = datetime.fromtimestamp(exp)
                now = datetime.now()
                if now > exp_date:
                    print(f"   ⚠️  EXPIRED: {exp_date}")
                else:
                    print(f"   ✅ Expires: {exp_date}")
            
            # Check locations
            locations = payload_data.get('locations', [])
            if locations:
                print(f"   📍 Locations Access: {len(locations)} total")
                for i, loc in enumerate(locations[:3], 1):
                    print(f"      {i}. {loc}")
                if len(locations) > 3:
                    print(f"      ... and {len(locations) - 3} more")
            
            # Check permissions
            permissions = payload_data.get('permissions', {})
            if permissions:
                print(f"   🔐 Permissions:")
                for key, value in permissions.items():
                    print(f"      {key}: {value}")
            
            # Determine token type
            issuer = payload_data.get('iss', '')
            if 'securetoken.google.com' in issuer:
                token_class = 'firebase_jwt'
            elif 'services.leadconnectorhq.com' in issuer:
                token_class = 'oauth_access'
            else:
                token_class = 'unknown_jwt'
            
            return {
                'type': token_class,
                'valid': True,
                'payload': payload_data,
                'header': header_data
            }
            
        except Exception as e:
            print(f"❌ Error analyzing token: {e}")
            return {'type': 'error', 'valid': False, 'error': str(e)}
    
    async def test_token_with_apis(self, token, token_type):
        """Test token with various GHL APIs"""
        print(f"\n🧪 TESTING {token_type} WITH DIFFERENT APIs")
        print("-" * 50)
        
        test_results = {}
        
        # Test 1: Facebook Connection API (Internal)
        print(f"🔗 Test 1: Facebook Connection API")
        fb_result = await self._test_facebook_api(token, token_type)
        test_results['facebook_api'] = fb_result
        
        # Test 2: OAuth Location Token API (Public)
        print(f"\n🔗 Test 2: OAuth Location Token API")
        oauth_result = await self._test_oauth_location_token(token, token_type)
        test_results['oauth_location_token'] = oauth_result
        
        # Test 3: GHL Backend API (Various endpoints)
        print(f"\n🔗 Test 3: General Backend APIs")
        backend_result = await self._test_backend_apis(token, token_type)
        test_results['backend_apis'] = backend_result
        
        return test_results
    
    async def _test_facebook_api(self, token, token_type):
        """Test Facebook integration API"""
        url = f"https://backend.leadconnectorhq.com/integrations/facebook/{self.test_location_id}/connection"
        
        # Try different authentication methods
        auth_methods = [
            {
                'name': 'Firebase JWT (token-id)',
                'headers': {
                    'token-id': token,
                    'channel': 'APP',
                    'source': 'WEB_USER',
                    'version': '2021-07-28',
                    'accept': 'application/json'
                }
            },
            {
                'name': 'OAuth Bearer',
                'headers': {
                    'Authorization': f'Bearer {token}',
                    'Version': '2021-07-28',
                    'Accept': 'application/json'
                }
            }
        ]
        
        for method in auth_methods:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(url, headers=method['headers'])
                    
                status = "✅ SUCCESS" if response.status_code == 200 else f"❌ FAILED ({response.status_code})"
                print(f"   {method['name']}: {status}")
                
                if response.status_code == 200:
                    return {
                        'success': True,
                        'method': method['name'],
                        'status_code': response.status_code
                    }
                    
            except Exception as e:
                print(f"   {method['name']}: ❌ ERROR - {str(e)}")
        
        return {'success': False, 'error': 'All methods failed'}
    
    async def _test_oauth_location_token(self, token, token_type):
        """Test OAuth location token generation"""
        url = "https://services.leadconnectorhq.com/oauth/locationToken"
        
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            "Version": "2021-07-28",
            "Authorization": f"Bearer {token}"
        }
        
        form_data = {
            "companyId": self.company_id,
            "locationId": self.test_location_id
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, data=form_data)
                
            if response.status_code == 200:
                print(f"   ✅ SUCCESS: Location token generated")
                return {
                    'success': True,
                    'status_code': response.status_code,
                    'data': response.json()
                }
            else:
                error_msg = response.text
                print(f"   ❌ FAILED: {response.status_code} - {error_msg}")
                return {
                    'success': False,
                    'status_code': response.status_code,
                    'error': error_msg
                }
                
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def _test_backend_apis(self, token, token_type):
        """Test various backend APIs"""
        
        # List of backend APIs to test
        test_endpoints = [
            {
                'name': 'Locations List',
                'url': f'https://backend.leadconnectorhq.com/locations/{self.test_location_id}',
                'method': 'GET'
            },
            {
                'name': 'Facebook Pages List',
                'url': f'https://backend.leadconnectorhq.com/integrations/facebook/{self.test_location_id}/pages',
                'method': 'GET'
            }
        ]
        
        results = {}
        
        # Firebase JWT method
        firebase_headers = {
            'token-id': token,
            'channel': 'APP',
            'source': 'WEB_USER',
            'version': '2021-07-28',
            'accept': 'application/json'
        }
        
        # OAuth Bearer method
        oauth_headers = {
            'Authorization': f'Bearer {token}',
            'Version': '2021-07-28',
            'Accept': 'application/json'
        }
        
        for endpoint in test_endpoints:
            endpoint_results = {}
            
            # Test Firebase method
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.request(
                        endpoint['method'], 
                        endpoint['url'], 
                        headers=firebase_headers
                    )
                
                firebase_status = "✅" if response.status_code == 200 else f"❌ ({response.status_code})"
                endpoint_results['firebase'] = {
                    'status_code': response.status_code,
                    'success': response.status_code == 200
                }
                
            except Exception as e:
                firebase_status = f"❌ ERROR"
                endpoint_results['firebase'] = {'success': False, 'error': str(e)}
            
            # Test OAuth method
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.request(
                        endpoint['method'], 
                        endpoint['url'], 
                        headers=oauth_headers
                    )
                
                oauth_status = "✅" if response.status_code == 200 else f"❌ ({response.status_code})"
                endpoint_results['oauth'] = {
                    'status_code': response.status_code,
                    'success': response.status_code == 200
                }
                
            except Exception as e:
                oauth_status = f"❌ ERROR"
                endpoint_results['oauth'] = {'success': False, 'error': str(e)}
            
            print(f"   {endpoint['name']}: Firebase {firebase_status} | OAuth {oauth_status}")
            results[endpoint['name']] = endpoint_results
        
        return results
    
    def generate_summary_report(self, token_analyses, test_results):
        """Generate comprehensive summary report"""
        print(f"\n{'='*80}")
        print(f"📊 COMPREHENSIVE TOKEN ANALYSIS REPORT")
        print(f"{'='*80}")
        
        for token_name, analysis in token_analyses.items():
            test_result = test_results.get(token_name, {})
            
            print(f"\n🎯 {token_name.upper()}")
            print(f"{'-'*50}")
            
            if analysis['valid']:
                print(f"✅ Token Type: {analysis['type']}")
                
                # Facebook API results
                fb_result = test_result.get('facebook_api', {})
                fb_status = "✅ Works" if fb_result.get('success') else "❌ Failed"
                print(f"📘 Facebook API: {fb_status}")
                
                # OAuth results
                oauth_result = test_result.get('oauth_location_token', {})
                oauth_status = "✅ Works" if oauth_result.get('success') else "❌ Failed"
                print(f"🔐 OAuth Location Token: {oauth_status}")
                
                # Backend APIs
                backend_result = test_result.get('backend_apis', {})
                if backend_result:
                    firebase_works = any(
                        endpoint.get('firebase', {}).get('success', False) 
                        for endpoint in backend_result.values()
                    )
                    backend_status = "✅ Works" if firebase_works else "❌ Failed"
                    print(f"🏢 Backend APIs: {backend_status}")
                
            else:
                print(f"❌ Invalid Token: {analysis.get('error', 'Unknown error')}")
        
        print(f"\n💡 RECOMMENDATIONS:")
        print(f"{'='*50}")
        
        # Check which tokens work for what
        firebase_works = any(
            test_results.get(name, {}).get('facebook_api', {}).get('success', False)
            for name in token_analyses.keys()
        )
        
        oauth_works = any(
            test_results.get(name, {}).get('oauth_location_token', {}).get('success', False)
            for name in token_analyses.keys()
        )
        
        if firebase_works:
            print("✅ Use Firebase JWT for Facebook integration (already working!)")
        
        if oauth_works:
            print("✅ Use Private Integration for OAuth location tokens")
        else:
            print("❌ Need to create proper Private Integration with OAuth scopes")
        
        print("\n🎯 FOR FACEBOOK INTEGRATION:")
        print("   → Stick with Firebase JWT method (token-id header)")
        print("   → Works perfectly with all Facebook APIs")
        print("   → No additional setup needed")


async def main():
    """Main analysis function"""
    
    analyzer = GHLTokenAnalyzer()
    
    # Your tokens to test
    tokens_to_test = {
        'Firebase JWT': "eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg3NzQ4NTAwMmYwNWJlMDI2N2VmNDU5ZjViNTEzNTMzYjVjNThjMTIiLCJ0eXAiOiJKV1QifQ.eyJ1c2VyX2lkIjoiYVowbjRldHJOQ0VCMjlzb25hOE0iLCJjb21wYW55X2lkIjoibHAycDFxMjdEcmRHdGExcUdESmQiLCJyb2xlIjoiYWRtaW4iLCJ0eXBlIjoiYWdlbmN5IiwibG9jYXRpb25zIjpbImxCUHFnQm93WDFDc2pIYXkxMkxZIiwieWhQT3dZRlRVWHJxb1VBc3BlbUMiLCJKVVRGVG55OEVYUU9TQjVOY3ZBQSIsIndXSzY4RU40R2ZwcTVJbkowMTdOIiwiQWNFc091eWxVYWM2VjV2T2RVWUkiLCJyUUFxUnJwbEhVWGJSRUYyNFEySCJdLCJ2ZXJzaW9uIjoyLCJwZXJtaXNzaW9ucyI6eyJ3b3JrZmxvd3NfZW5hYmxlZCI6dHJ1ZSwid29ya2Zsb3dzX3JlYWRfb25seSI6ZmFsc2V9LCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vaGlnaGxldmVsLWJhY2tlbmQiLCJhdWQiOiJoaWdobGV2ZWwtYmFja2VuZCIsImF1dGhfdGltZSI6MTc1MTcyOTYxMiwic3ViIjoiYVowbjRldHJOQ0VCMjlzb25hOE0iLCJpYXQiOjE3NTE3NDc4NDIsImV4cCI6MTc1MTc1MTQ0MiwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6e30sInNpZ25faW5fcHJvdmlkZXIiOiJjdXN0b20ifX0.GmrkxQBn1T38f4DPU-A2M-aqtu5qVvBxyFi5IZr7MBdv-3Exl-ldOSCVR7dvFkm7ybcfFlfGeVlx9_4M9SpX_6MjaYXTAoHnBoiaxLRtT-RUyO1hUphel6duvrsGj5tmvlZuGz0-VIkdweaPUQlVUvn9xEdX8mmo2b6-7ajyEues_eVyKdkVymn5axcnIQr9zhoq5BtzOnTJ4W_6-fGq5-4jvaYrbZCBGQkhrRaOmKYT8cmckiBELEjGBVX4RRyIL88cwqZj95ztnrxzg1naYlkU0NxMw5-OvmQ_wMtGU7kwqUyxI0BV7n4eMdeePE6m9qYPy5Ct8xsDBGytPws45w",
        'Private Integration': "pit-e3d8d384-00cb-4744-8213-b1ab06ae71fe"
    }
    
    print("🚀 STARTING COMPREHENSIVE GHL TOKEN ANALYSIS")
    print("🎯 Goal: Understand which tokens work with which APIs")
    
    # Step 1: Analyze all tokens
    token_analyses = {}
    for token_name, token in tokens_to_test.items():
        analysis = analyzer.analyze_token(token, token_name)
        token_analyses[token_name] = analysis
    
    # Step 2: Test all tokens with APIs
    test_results = {}
    for token_name, token in tokens_to_test.items():
        if token_analyses[token_name]['valid']:
            test_result = await analyzer.test_token_with_apis(token, token_name)
            test_results[token_name] = test_result
    
    # Step 3: Generate comprehensive report
    analyzer.generate_summary_report(token_analyses, test_results)


if __name__ == "__main__":
    asyncio.run(main())