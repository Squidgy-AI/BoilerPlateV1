#!/usr/bin/env python3
"""
Test GHL Location Token Generation with Agency API Keys
Using the proper OAuth access tokens from your constants
"""

import asyncio
import json
import base64
from typing import Dict
import httpx


class GHLAgencyTokenTest:
    """Test location token generation with proper agency OAuth tokens"""
    
    def __init__(self):
        # Your agency credentials from constants.py
        self.agency_access_key = 'pit-e3d8d384-00cb-4744-8213-b1ab06ae71fe'  # OAuth access token
        self.agency_api_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb21wYW55X2lkIjoibHAycDFxMjdEcmRHdGExcUdESmQiLCJ2ZXJzaW9uIjoxLCJpYXQiOjE3NTI5NzkyOTg1MTQsInN1YiI6ImFaMG40ZXRyTkNFQjI5c29uYThNIn0.zt2d4Nrb8PDciLxYyaGLHnYl9TsODUcCWalGc74n1AQ'
        self.company_id = 'lp2p1q27DrdGta1qGDJd'
        
        # Available location IDs from your constants
        self.test_locations = {
            'main_location': 'lBPqgBowX1CsjHay12LY',
            'kitkat': 'kmfwpeEjk5QjgGVdD4Su',
            'nescafe': '6ZHPyo1FRlZNBGzH5szG', 
            'maggie': 'Fj1JPxueiId1Ki15fZZA'
        }
        
        self.base_url = "https://services.leadconnectorhq.com"
        
        # Decode and analyze the Agency API Key
        self._analyze_agency_api_key()
    
    def _analyze_agency_api_key(self):
        """Analyze the Agency API Key JWT token"""
        try:
            parts = self.agency_api_key.split('.')
            payload = parts[1]
            payload += '=' * (4 - len(payload) % 4)
            
            decoded = json.loads(base64.b64decode(payload))
            
            print("🔍 Agency API Key Analysis:")
            print("=" * 40)
            print(f"Company ID: {decoded.get('company_id')}")
            print(f"Version: {decoded.get('version')}")
            print(f"Subject: {decoded.get('sub')}")
            print(f"Issued At: {decoded.get('iat')}")
            print()
            
        except Exception as e:
            print(f"❌ Error analyzing Agency API Key: {e}")
    
    async def test_location_token_generation(self, location_name: str, location_id: str) -> Dict:
        """
        Test location token generation using Agency Access Key
        
        Args:
            location_name: Friendly name for the location
            location_id: GHL location ID
            
        Returns:
            dict: Test results
        """
        print(f"🧪 Testing location token generation for {location_name} ({location_id})")
        print("-" * 60)
        
        url = f"{self.base_url}/oauth/locationToken"
        
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded", 
            "Version": "2021-07-28",
            "Authorization": f"Bearer {self.agency_access_key}"  # Using OAuth access token
        }
        
        # Form data as per API spec
        form_data = {
            "companyId": self.company_id,
            "locationId": location_id
        }
        
        print(f"📤 Request Details:")
        print(f"   URL: {url}")
        print(f"   Company ID: {self.company_id}")
        print(f"   Location ID: {location_id}")
        print(f"   Access Key: {self.agency_access_key[:20]}...")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, data=form_data)
            
            print(f"📥 Response: {response.status_code}")
            
            if response.status_code == 200:
                token_data = response.json()
                
                print(f"✅ SUCCESS! Location token generated:")
                print(f"   Access Token: {token_data.get('access_token', 'N/A')[:30]}...")
                print(f"   Token Type: {token_data.get('token_type', 'N/A')}")
                print(f"   Expires In: {token_data.get('expires_in', 'N/A')} seconds")
                print(f"   Scope: {token_data.get('scope', 'N/A')}")
                print(f"   Location ID: {token_data.get('locationId', 'N/A')}")
                print(f"   Plan ID: {token_data.get('planId', 'N/A')}")
                print(f"   User ID: {token_data.get('userId', 'N/A')}")
                
                return {
                    "success": True,
                    "location_name": location_name,
                    "location_id": location_id,
                    "token_data": token_data
                }
            else:
                error_text = response.text
                print(f"❌ FAILED! Status: {response.status_code}")
                print(f"   Error: {error_text}")
                
                return {
                    "success": False,
                    "location_name": location_name,
                    "location_id": location_id,
                    "status_code": response.status_code,
                    "error": error_text
                }
    
    async def test_location_token_with_facebook_api(self, location_id: str, location_token: str) -> Dict:
        """
        Test the generated location token with Facebook API
        
        Args:
            location_id: Location ID
            location_token: Generated location access token
            
        Returns:
            dict: Facebook API test results
        """
        print(f"\n🔗 Testing location token with Facebook API...")
        
        # Test Facebook connection endpoint using location token instead of JWT
        facebook_url = f"https://backend.leadconnectorhq.com/integrations/facebook/{location_id}/connection"
        
        headers = {
            "Authorization": f"Bearer {location_token}",
            "Version": "2021-07-28",
            "Accept": "application/json",
            "channel": "APP",
            "source": "WEB_USER"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(facebook_url, headers=headers)
            
            print(f"📥 Facebook API Response: {response.status_code}")
            
            if response.status_code == 200:
                print(f"✅ Location token works with Facebook API!")
                facebook_data = response.json()
                return {
                    "success": True,
                    "facebook_connected": True,
                    "facebook_data": facebook_data
                }
            elif response.status_code == 401:
                print(f"❌ Location token authorization failed with Facebook API")
                return {
                    "success": False,
                    "facebook_connected": False,
                    "error": "Unauthorized - location token not accepted"
                }
            else:
                print(f"❌ Facebook API returned: {response.status_code}")
                return {
                    "success": False,
                    "facebook_connected": False,
                    "status_code": response.status_code,
                    "error": response.text
                }
    
    async def run_complete_test(self):
        """Run complete test of location token generation and usage"""
        
        print("🚀 TESTING AGENCY API KEYS WITH LOCATION TOKEN GENERATION")
        print("=" * 80)
        
        results = {}
        
        # Test each location
        for location_name, location_id in self.test_locations.items():
            print(f"\n{'='*80}")
            print(f"🎯 TESTING: {location_name.upper()}")
            print(f"{'='*80}")
            
            try:
                # Step 1: Generate location token
                token_result = await self.test_location_token_generation(location_name, location_id)
                results[location_name] = token_result
                
                if token_result["success"]:
                    # Step 2: Test location token with Facebook API
                    location_token = token_result["token_data"]["access_token"]
                    facebook_result = await self.test_location_token_with_facebook_api(location_id, location_token)
                    token_result["facebook_test"] = facebook_result
                    
                    print(f"\n📊 SUMMARY for {location_name}:")
                    print(f"   ✅ Location Token: Generated")
                    print(f"   {'✅' if facebook_result['success'] else '❌'} Facebook API: {'Works' if facebook_result['success'] else 'Failed'}")
                else:
                    print(f"\n📊 SUMMARY for {location_name}:")
                    print(f"   ❌ Location Token: Failed")
                    print(f"   ❌ Facebook API: Skipped")
                
            except Exception as e:
                print(f"💥 Error testing {location_name}: {str(e)}")
                results[location_name] = {
                    "success": False,
                    "error": str(e)
                }
            
            print("-" * 40)
        
        # Final summary
        print(f"\n🏁 FINAL RESULTS SUMMARY")
        print("=" * 50)
        successful = sum(1 for r in results.values() if r.get("success"))
        print(f"✅ Successful location tokens: {successful}/{len(self.test_locations)}")
        print(f"❌ Failed: {len(self.test_locations) - successful}/{len(self.test_locations)}")
        
        for name, result in results.items():
            status = "✅ SUCCESS" if result.get("success") else "❌ FAILED"
            fb_status = ""
            if result.get("facebook_test"):
                fb_status = " + FB API ✅" if result["facebook_test"]["success"] else " + FB API ❌"
            print(f"   {name}: {status}{fb_status}")
        
        return results


async def main():
    """Main test function"""
    
    print("🎯 GOAL: Test Agency API Keys for Location Token Generation")
    print("📋 Will test location token generation for Nestle brand locations")
    print("🔗 Then test if location tokens work with Facebook integration APIs")
    print()
    
    tester = GHLAgencyTokenTest()
    results = await tester.run_complete_test()
    
    print(f"\n💡 KEY INSIGHTS:")
    print("1. Agency Access Key (pit-*) should work for /oauth/locationToken")
    print("2. Generated location tokens should work with Facebook APIs")
    print("3. This provides proper OAuth-compliant authentication flow")


if __name__ == "__main__":
    asyncio.run(main())