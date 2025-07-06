#!/usr/bin/env python3
"""
Test script for GHL Facebook Integration API Endpoints
Demonstrates how to use the three main Facebook endpoints.
"""

import json
import asyncio
from typing import Dict, List, Optional
import httpx


class GHLFacebookAPI:
    """Client for GoHighLevel Facebook Integration API"""
    
    def __init__(self, jwt_token: str):
        self.base_url = "https://backend.leadconnectorhq.com"
        self.jwt_token = jwt_token
        self.headers = {
            "token-id": jwt_token,
            "channel": "APP", 
            "source": "WEB_USER",
            "version": "2021-07-28",
            "accept": "application/json, text/plain, */*",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
    
    async def check_facebook_connection(self, location_id: str) -> Dict:
        """
        Check if Facebook is connected to the GHL location
        
        Returns:
            dict: Connection status and details
        """
        url = f"{self.base_url}/integrations/facebook/{location_id}/connection"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            
            result = {
                "connected": response.status_code == 200,
                "status_code": response.status_code,
                "location_id": location_id
            }
            
            if response.status_code == 200:
                result["data"] = response.json()
                print(f"✅ Facebook is connected for location {location_id}")
            else:
                print(f"❌ Facebook not connected for location {location_id} (Status: {response.status_code})")
                result["error"] = response.text
            
            return result
    
    async def list_facebook_pages(self, location_id: str, get_all: bool = True, limit: int = 100) -> Dict:
        """
        Get all Facebook pages available to the connected account
        
        Args:
            location_id: GHL location ID
            get_all: Whether to get all pages or just connected ones
            limit: Maximum number of pages to return
            
        Returns:
            dict: Pages data with metadata
        """
        url = f"{self.base_url}/integrations/facebook/{location_id}/pages"
        params = {}
        
        if get_all:
            params["getAll"] = "true"
        if limit:
            params["limit"] = limit
            
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                pages = data.get("pages", []) if isinstance(data, dict) else data
                
                print(f"✅ Found {len(pages)} Facebook pages for location {location_id}")
                
                # Print page summary
                for i, page in enumerate(pages[:5], 1):  # Show first 5 pages
                    print(f"   {i}. {page.get('name', 'Unknown')} (ID: {page.get('id', 'Unknown')})")
                
                if len(pages) > 5:
                    print(f"   ... and {len(pages) - 5} more pages")
                
                return {
                    "success": True,
                    "location_id": location_id,
                    "total_pages": len(pages),
                    "pages": pages
                }
            else:
                print(f"❌ Failed to get pages for location {location_id} (Status: {response.status_code})")
                return {
                    "success": False,
                    "location_id": location_id,
                    "status_code": response.status_code,
                    "error": response.text
                }
    
    async def attach_facebook_pages(self, location_id: str, pages_to_attach: List[Dict]) -> Dict:
        """
        Attach/connect selected Facebook pages to GHL location
        
        Args:
            location_id: GHL location ID
            pages_to_attach: List of page objects to attach
            
        Returns:
            dict: Attachment result
        """
        url = f"{self.base_url}/integrations/facebook/{location_id}/pages"
        
        # Prepare headers for POST request
        post_headers = {
            **self.headers,
            "content-type": "application/json"
        }
        
        # Format pages for GHL backend
        formatted_pages = []
        for page in pages_to_attach:
            formatted_page = {
                "id": page.get("id"),
                "name": page.get("name"),
                "picture": page.get("picture", {}).get("data", {}).get("url", "") if isinstance(page.get("picture"), dict) else page.get("picture", ""),
                "access_token": page.get("access_token", ""),
                "category": page.get("category", ""),
                "tasks": page.get("tasks", [])
            }
            formatted_pages.append(formatted_page)
        
        payload = {"pages": formatted_pages}
        
        print(f"📤 Attaching {len(formatted_pages)} pages to location {location_id}...")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=post_headers, json=payload)
            
            if response.status_code in [200, 201]:
                result_data = response.json()
                print(f"✅ Successfully attached {len(formatted_pages)} Facebook pages!")
                
                return {
                    "success": True,
                    "location_id": location_id,
                    "attached_count": len(formatted_pages),
                    "response_data": result_data
                }
            else:
                print(f"❌ Failed to attach pages (Status: {response.status_code})")
                print(f"Error: {response.text}")
                
                return {
                    "success": False,
                    "location_id": location_id,
                    "status_code": response.status_code,
                    "error": response.text
                }
    
    async def complete_facebook_integration_flow(self, location_id: str, page_selection_limit: int = 2) -> Dict:
        """
        Complete end-to-end Facebook integration flow
        
        Args:
            location_id: GHL location ID
            page_selection_limit: Max number of pages to auto-select for testing
            
        Returns:
            dict: Complete flow results
        """
        print(f"\n🔄 Starting complete Facebook integration flow for location: {location_id}")
        print("=" * 60)
        
        # Step 1: Check connection
        print("\n📋 Step 1: Checking Facebook connection...")
        connection_result = await self.check_facebook_connection(location_id)
        
        if not connection_result["connected"]:
            return {
                "success": False,
                "step_failed": "check_connection",
                "message": "Facebook is not connected. Please complete OAuth flow first.",
                "results": {"connection": connection_result}
            }
        
        # Step 2: List pages
        print("\n📋 Step 2: Listing Facebook pages...")
        pages_result = await self.list_facebook_pages(location_id)
        
        if not pages_result["success"]:
            return {
                "success": False,
                "step_failed": "list_pages",
                "message": "Failed to retrieve Facebook pages.",
                "results": {
                    "connection": connection_result,
                    "pages": pages_result
                }
            }
        
        # Step 3: Auto-select pages for testing (first N pages)
        available_pages = pages_result["pages"]
        if not available_pages:
            return {
                "success": False,
                "step_failed": "no_pages",
                "message": "No Facebook pages found to attach.",
                "results": {
                    "connection": connection_result,
                    "pages": pages_result
                }
            }
        
        # Select first few pages for testing
        pages_to_attach = available_pages[:page_selection_limit]
        
        print(f"\n📋 Step 3: Attaching {len(pages_to_attach)} selected pages...")
        print("Selected pages:")
        for page in pages_to_attach:
            print(f"   • {page.get('name', 'Unknown')} (ID: {page.get('id', 'Unknown')})")
        
        # Step 4: Attach pages
        attach_result = await self.attach_facebook_pages(location_id, pages_to_attach)
        
        # Final results
        success = attach_result["success"]
        
        print(f"\n🎉 Integration flow completed: {'SUCCESS' if success else 'FAILED'}")
        print("=" * 60)
        
        return {
            "success": success,
            "location_id": location_id,
            "summary": {
                "connection_status": "connected" if connection_result["connected"] else "not_connected",
                "total_pages_found": len(available_pages),
                "pages_attached": len(pages_to_attach) if success else 0
            },
            "results": {
                "connection": connection_result,
                "pages": pages_result,
                "attachment": attach_result
            }
        }


async def test_single_location(jwt_token: str, location_id: str):
    """Test Facebook integration for a single location"""
    api = GHLFacebookAPI(jwt_token)
    return await api.complete_facebook_integration_flow(location_id)


async def test_multiple_locations(jwt_token: str, location_ids: List[str]):
    """Test Facebook integration for multiple locations"""
    api = GHLFacebookAPI(jwt_token)
    results = {}
    
    print(f"🚀 Testing Facebook integration for {len(location_ids)} locations...")
    
    for location_id in location_ids:
        print(f"\n{'='*80}")
        print(f"Testing Location: {location_id}")
        print(f"{'='*80}")
        
        try:
            result = await api.complete_facebook_integration_flow(location_id)
            results[location_id] = result
        except Exception as e:
            print(f"❌ Error testing location {location_id}: {str(e)}")
            results[location_id] = {
                "success": False,
                "error": str(e)
            }
    
    # Summary
    print(f"\n📊 SUMMARY - Facebook Integration Test Results")
    print("=" * 80)
    successful = sum(1 for r in results.values() if r.get("success"))
    print(f"✅ Successful: {successful}/{len(location_ids)}")
    print(f"❌ Failed: {len(location_ids) - successful}/{len(location_ids)}")
    
    for location_id, result in results.items():
        status = "✅ SUCCESS" if result.get("success") else "❌ FAILED"
        summary = result.get("summary", {})
        pages_attached = summary.get("pages_attached", 0)
        print(f"   {location_id}: {status} ({pages_attached} pages attached)")
    
    return results


# Example usage and test functions
async def main():
    """Main test function"""
    
    # JWT Token (Replace with your actual token)
    JWT_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg3NzQ4NTAwMmYwNWJlMDI2N2VmNDU5ZjViNTEzNTMzYjVjNThjMTIiLCJ0eXAiOiJKV1QifQ.eyJ1c2VyX2lkIjoiYVowbjRldHJOQ0VCMjlzb25hOE0iLCJjb21wYW55X2lkIjoibHAycDFxMjdEcmRHdGExcUdESmQiLCJyb2xlIjoiYWRtaW4iLCJ0eXBlIjoiYWdlbmN5IiwibG9jYXRpb25zIjpbImxCUHFnQm93WDFDc2pIYXkxMkxZIiwieWhQT3dZRlRVWHJxb1VBc3BlbUMiLCJKVVRGVG55OEVYUU9TQjVOY3ZBQSIsIndXSzY4RU40R2ZwcTVJbkowMTdOIiwiQWNFc091eWxVYWM2VjV2T2RVWUkiLCJyUUFxUnJwbEhVWGJSRUYyNFEySCJdLCJ2ZXJzaW9uIjoyLCJwZXJtaXNzaW9ucyI6eyJ3b3JrZmxvd3NfZW5hYmxlZCI6dHJ1ZSwid29ya2Zsb3dzX3JlYWRfb25seSI6ZmFsc2V9LCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vaGlnaGxldmVsLWJhY2tlbmQiLCJhdWQiOiJoaWdobGV2ZWwtYmFja2VuZCIsImF1dGhfdGltZSI6MTc1MTcyOTYxMiwic3ViIjoiYVowbjRldHJOQ0VCMjlzb25hOE0iLCJpYXQiOjE3NTE3NDc4NDIsImV4cCI6MTc1MTc1MTQ0MiwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6e30sInNpZ25faW5fcHJvdmlkZXIiOiJjdXN0b20ifX0.GmrkxQBn1T38f4DPU-A2M-aqtu5qVvBxyFi5IZr7MBdv-3Exl-ldOSCVR7dvFkm7ybcfFlfGeVlx9_4M9SpX_6MjaYXTAoHnBoiaxLRtT-RUyO1hUphel6duvrsGj5tmvlZuGz0-VIkdweaPUQlVUvn9xEdX8mmo2b6-7ajyEues_eVyKdkVymn5axcnIQr9zhoq5BtzOnTJ4W_6-fGq5-4jvaYrbZCBGQkhrRaOmKYT8cmckiBELEjGBVX4RRyIL88cwqZj95ztnrxzg1naYlkU0NxMw5-OvmQ_wMtGU7kwqUyxI0BV7n4eMdeePE6m9qYPy5Ct8xsDBGytPws45w"
    
    # Available location IDs from JWT
    LOCATION_IDS = [
        "lBPqgBowX1CsjHay12LY",  # Primary test location
        "yhPOwYFTUXrqoUAspemC", 
        "JUTFTny8EXQOSB5NcvAA",
        "wWK68EN4Gfpq5IlJ017N",
        "AcEsOuylUac6V5vOdUYI",
        "rQAqRrplHUXbREF24Q2H"
    ]
    
    # Test single location
    print("🧪 Testing single location...")
    result = await test_single_location(JWT_TOKEN, LOCATION_IDS[0])
    
    # Optionally test multiple locations
    # print("\n🧪 Testing multiple locations...")
    # results = await test_multiple_locations(JWT_TOKEN, LOCATION_IDS[:3])


if __name__ == "__main__":
    # Run the test
    asyncio.run(main())
    
    print("\n📝 Usage Examples:")
    print("=" * 50)
    print("# Test single location:")
    print("python test_facebook_endpoints.py")
    print()
    print("# Or use the API class directly:")
    print("api = GHLFacebookAPI('your_jwt_token')")
    print("await api.check_facebook_connection('location_id')")
    print("await api.list_facebook_pages('location_id')")
    print("await api.attach_facebook_pages('location_id', pages_list)")