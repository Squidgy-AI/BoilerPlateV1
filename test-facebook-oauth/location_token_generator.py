#!/usr/bin/env python3
"""
GHL Location Token Generator
Converts Agency JWT token to location-specific access tokens using GHL API
"""

import asyncio
import json
from typing import Dict, List
import httpx
import base64


class GHLLocationTokenGenerator:
    """Generate location-specific access tokens from agency JWT token"""
    
    def __init__(self, agency_jwt_token: str):
        self.agency_jwt_token = agency_jwt_token
        self.base_url = "https://services.leadconnectorhq.com"
        self.company_id = None
        self.available_locations = []
        
        # Parse JWT to get company_id and locations
        self._parse_jwt_token()
    
    def _parse_jwt_token(self):
        """Parse JWT token to extract company_id and available locations"""
        try:
            # Split JWT and decode payload
            parts = self.agency_jwt_token.split('.')
            payload = parts[1]
            payload += '=' * (4 - len(payload) % 4)  # Add padding
            
            decoded_bytes = base64.b64decode(payload)
            jwt_data = json.loads(decoded_bytes)
            
            self.company_id = jwt_data.get('company_id')
            self.available_locations = jwt_data.get('locations', [])
            
            print(f"🏢 Company ID: {self.company_id}")
            print(f"📍 Available Locations: {len(self.available_locations)}")
            for i, loc in enumerate(self.available_locations, 1):
                print(f"   {i}. {loc}")
            
        except Exception as e:
            print(f"❌ Error parsing JWT token: {e}")
            raise
    
    async def get_location_token(self, location_id: str) -> Dict:
        """
        Generate location access token for specific location
        
        Args:
            location_id: The location ID to generate token for
            
        Returns:
            dict: Location token response with access_token, expires_in, etc.
        """
        if location_id not in self.available_locations:
            raise ValueError(f"Location {location_id} not available in agency token")
        
        url = f"{self.base_url}/oauth/locationToken"
        
        headers = {
            "Version": "2021-07-28",
            "Authorization": f"Bearer {self.agency_jwt_token}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        # Form data as per API spec
        form_data = {
            "companyId": self.company_id,
            "locationId": location_id
        }
        
        print(f"🔄 Generating location token for: {location_id}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, data=form_data)
            
            if response.status_code == 200:
                token_data = response.json()
                
                print(f"✅ Location token generated successfully!")
                print(f"   Access Token: {token_data.get('access_token', 'N/A')[:20]}...")
                print(f"   Token Type: {token_data.get('token_type', 'N/A')}")
                print(f"   Expires In: {token_data.get('expires_in', 'N/A')} seconds")
                print(f"   Scope: {token_data.get('scope', 'N/A')}")
                print(f"   Location ID: {token_data.get('locationId', 'N/A')}")
                
                return {
                    "success": True,
                    "location_id": location_id,
                    "token_data": token_data
                }
            else:
                error_text = response.text
                print(f"❌ Failed to generate location token (Status: {response.status_code})")
                print(f"   Error: {error_text}")
                
                return {
                    "success": False,
                    "location_id": location_id,
                    "status_code": response.status_code,
                    "error": error_text
                }
    
    async def get_all_location_tokens(self) -> Dict[str, Dict]:
        """
        Generate location tokens for all available locations
        
        Returns:
            dict: Mapping of location_id -> token_data
        """
        print(f"🚀 Generating location tokens for all {len(self.available_locations)} locations...")
        print("=" * 80)
        
        results = {}
        
        for location_id in self.available_locations:
            try:
                result = await self.get_location_token(location_id)
                results[location_id] = result
                
                if result["success"]:
                    print(f"✅ {location_id}: SUCCESS")
                else:
                    print(f"❌ {location_id}: FAILED - {result.get('error', 'Unknown error')}")
                
            except Exception as e:
                print(f"💥 {location_id}: ERROR - {str(e)}")
                results[location_id] = {
                    "success": False,
                    "error": str(e)
                }
            
            print("-" * 40)
        
        # Summary
        successful = sum(1 for r in results.values() if r.get("success"))
        print(f"\n📊 SUMMARY:")
        print(f"✅ Successful: {successful}/{len(self.available_locations)}")
        print(f"❌ Failed: {len(self.available_locations) - successful}/{len(self.available_locations)}")
        
        return results
    
    async def test_location_token_with_facebook_api(self, location_id: str, location_token: str) -> Dict:
        """
        Test the generated location token with Facebook API endpoints
        
        Args:
            location_id: Location ID
            location_token: Generated location access token
            
        Returns:
            dict: Test results
        """
        print(f"🧪 Testing location token with Facebook API for {location_id}...")
        
        # Test Facebook connection endpoint
        facebook_url = f"https://backend.leadconnectorhq.com/integrations/facebook/{location_id}/connection"
        
        headers = {
            "Authorization": f"Bearer {location_token}",
            "Version": "2021-07-28",
            "Accept": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(facebook_url, headers=headers)
            
            result = {
                "location_id": location_id,
                "facebook_api_status": response.status_code,
                "facebook_connected": response.status_code == 200
            }
            
            if response.status_code == 200:
                print(f"✅ Facebook API works with location token!")
                result["facebook_data"] = response.json()
            else:
                print(f"❌ Facebook API failed with location token (Status: {response.status_code})")
                result["error"] = response.text
            
            return result


async def main():
    """Main test function"""
    
    # Your agency JWT token
    AGENCY_JWT_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg3NzQ4NTAwMmYwNWJlMDI2N2VmNDU5ZjViNTEzNTMzYjVjNThjMTIiLCJ0eXAiOiJKV1QifQ.eyJ1c2VyX2lkIjoiYVowbjRldHJOQ0VCMjlzb25hOE0iLCJjb21wYW55X2lkIjoibHAycDFxMjdEcmRHdGExcUdESmQiLCJyb2xlIjoiYWRtaW4iLCJ0eXBlIjoiYWdlbmN5IiwibG9jYXRpb25zIjpbImxCUHFnQm93WDFDc2pIYXkxMkxZIiwieWhQT3dZRlRVWHJxb1VBc3BlbUMiLCJKVVRGVG55OEVYUU9TQjVOY3ZBQSIsIndXSzY4RU40R2ZwcTVJbkowMTdOIiwiQWNFc091eWxVYWM2VjV2T2RVWUkiLCJyUUFxUnJwbEhVWGJSRUYyNFEySCJdLCJ2ZXJzaW9uIjoyLCJwZXJtaXNzaW9ucyI6eyJ3b3JrZmxvd3NfZW5hYmxlZCI6dHJ1ZSwid29ya2Zsb3dzX3JlYWRfb25seSI6ZmFsc2V9LCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vaGlnaGxldmVsLWJhY2tlbmQiLCJhdWQiOiJoaWdobGV2ZWwtYmFja2VuZCIsImF1dGhfdGltZSI6MTc1MTcyOTYxMiwic3ViIjoiYVowbjRldHJOQ0VCMjlzb25hOE0iLCJpYXQiOjE3NTE3NDc4NDIsImV4cCI6MTc1MTc1MTQ0MiwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6e30sInNpZ25faW5fcHJvdmlkZXIiOiJjdXN0b20ifX0.GmrkxQBn1T38f4DPU-A2M-aqtu5qVvBxyFi5IZr7MBdv-3Exl-ldOSCVR7dvFkm7ybcfFlfGeVlx9_4M9SpX_6MjaYXTAoHnBoiaxLRtT-RUyO1hUphel6duvrsGj5tmvlZuGz0-VIkdweaPUQlVUvn9xEdX8mmo2b6-7ajyEues_eVyKdkVymn5axcnIQr9zhoq5BtzOnTJ4W_6-fGq5-4jvaYrbZCBGQkhrRaOmKYT8cmckiBELEjGBVX4RRyIL88cwqZj95ztnrxzg1naYlkU0NxMw5-OvmQ_wMtGU7kwqUyxI0BV7n4eMdeePE6m9qYPy5Ct8xsDBGytPws45w"
    
    # Initialize the token generator
    generator = GHLLocationTokenGenerator(AGENCY_JWT_TOKEN)
    
    print("🎯 GOAL: Generate location-specific access tokens from agency JWT")
    print("=" * 80)
    
    # Test 1: Generate token for single location
    test_location = generator.available_locations[0]  # lBPqgBowX1CsjHay12LY
    print(f"\n📋 Test 1: Generate token for single location ({test_location})")
    print("-" * 60)
    
    single_result = await generator.get_location_token(test_location)
    
    if single_result["success"]:
        # Test the location token with Facebook API
        location_token = single_result["token_data"]["access_token"]
        print(f"\n🧪 Testing generated location token with Facebook API...")
        facebook_test = await generator.test_location_token_with_facebook_api(test_location, location_token)
        print(f"Facebook API Test Result: {facebook_test}")
    
    # Test 2: Generate tokens for all locations (optional - uncomment to run)
    print(f"\n📋 Test 2: Generate tokens for ALL locations (optional)")
    print("Uncomment the line below to test all locations:")
    print("# all_results = await generator.get_all_location_tokens()")
    
    # Uncomment this to test all locations:
    # all_results = await generator.get_all_location_tokens()
    
    print(f"\n✅ Location token generation test completed!")
    print(f"💡 The generated location tokens can be used instead of JWT for API calls")


if __name__ == "__main__":
    # Run the location token generator test
    asyncio.run(main())
    
    print(f"\n📝 Usage Examples:")
    print("=" * 50)
    print("# Generate location token:")
    print("generator = GHLLocationTokenGenerator('your_agency_jwt')")
    print("result = await generator.get_location_token('location_id')")
    print("location_token = result['token_data']['access_token']")
    print()
    print("# Use location token in API calls:")
    print("headers = {'Authorization': f'Bearer {location_token}'}")
    print("# Instead of: {'token-id': 'agency_jwt_token'}")