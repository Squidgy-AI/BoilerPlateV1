#!/usr/bin/env python3
"""
🔗 CREATE GHL SNAPSHOT SHARE LINK
=================================
Creates share links for GoHighLevel snapshots with various sharing options

This script allows you to:
1. Create public share links
2. Create permanent share links 
3. Create agency-restricted links
4. Create location-restricted links

SHARE TYPES:
- link: Standard share link
- permanent_link: Permanent share link that doesn't expire
- agency_link: Restricted to specific agencies
- location_link: Restricted to specific sub-accounts

USAGE:
1. Update configuration below with your details
2. Run: python create_snapshot_share_link.py
"""

import httpx
import asyncio
import json
from typing import Optional, List
from datetime import datetime


class SnapshotShareLinkCreator:
    """Create share links for GHL snapshots"""
    
    def __init__(self):
        # Configuration - UPDATE THESE VALUES
        # ===================================
        self.agency_token = "YOUR_AGENCY_TOKEN_HERE"  # Agency-level token required
        self.company_id = "lp2p1q27DrdGta1qGDJd"     # Your company ID
        
        # API Configuration
        self.base_url = "https://services.leadconnectorhq.com"
        self.headers = {
            "Authorization": f"Bearer {self.agency_token}",
            "Version": "2021-07-28",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    async def create_share_link(
        self,
        snapshot_id: str,
        share_type: str = "permanent_link",
        relationship_numbers: Optional[List[str]] = None,
        share_location_ids: Optional[List[str]] = None
    ) -> dict:
        """
        Create a share link for a snapshot
        
        Args:
            snapshot_id: ID of the snapshot to share
            share_type: Type of share link (link, permanent_link, agency_link, location_link)
            relationship_numbers: List of agency relationship numbers (for agency_link)
            share_location_ids: List of sub-account IDs (for location_link)
            
        Returns:
            dict: Response containing share link details
        """
        
        print(f"\n🔗 CREATING SNAPSHOT SHARE LINK")
        print("=" * 40)
        print(f"📸 Snapshot ID: {snapshot_id}")
        print(f"🔐 Share Type: {share_type}")
        
        # Build request body
        body = {
            "snapshot_id": snapshot_id,
            "share_type": share_type
        }
        
        # Add optional parameters based on share type
        if share_type == "agency_link" and relationship_numbers:
            body["relationship_number"] = ",".join(relationship_numbers)
            print(f"🏢 Agency Numbers: {body['relationship_number']}")
            
        if share_type == "location_link" and share_location_ids:
            body["share_location_id"] = ",".join(share_location_ids)
            print(f"📍 Location IDs: {body['share_location_id']}")
        
        # Build URL with query parameter
        url = f"{self.base_url}/snapshots/share/link?companyId={self.company_id}"
        
        print(f"\n📡 Request Details:")
        print(f"   URL: {url}")
        print(f"   Method: POST")
        print(f"   Body: {json.dumps(body, indent=2)}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    headers=self.headers,
                    json=body
                )
            
            print(f"\n📊 Response Status: {response.status_code}")
            
            if response.status_code == 201:
                data = response.json()
                print(f"✅ SUCCESS! Share link created")
                print(f"\n🔗 Share Link Details:")
                print(f"   ID: {data.get('id')}")
                print(f"   Share Link: {data.get('shareLink')}")
                
                return {
                    "success": True,
                    "data": data
                }
            else:
                print(f"❌ Failed to create share link")
                print(f"   Error: {response.text}")
                return {
                    "success": False,
                    "error": response.text,
                    "status_code": response.status_code
                }
                
        except Exception as e:
            print(f"💥 Error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def create_multiple_share_types(self, snapshot_id: str) -> dict:
        """
        Create multiple share link types for the same snapshot
        
        Args:
            snapshot_id: ID of the snapshot
            
        Returns:
            dict: Results for each share type
        """
        
        print(f"\n🔄 CREATING MULTIPLE SHARE LINK TYPES")
        print("=" * 50)
        
        results = {}
        
        # Test different share types
        share_configs = [
            {
                "name": "Standard Link",
                "type": "link",
                "params": {}
            },
            {
                "name": "Permanent Link",
                "type": "permanent_link",
                "params": {}
            },
            {
                "name": "Agency Link",
                "type": "agency_link",
                "params": {
                    "relationship_numbers": ["0-128-926", "1-208-926"]  # Example agency numbers
                }
            },
            {
                "name": "Location Link",
                "type": "location_link",
                "params": {
                    "share_location_ids": ["lBPqgBowX1CsjHay12LY"]  # Nestle LLC location
                }
            }
        ]
        
        for config in share_configs:
            print(f"\n📋 Creating {config['name']}...")
            
            result = await self.create_share_link(
                snapshot_id=snapshot_id,
                share_type=config["type"],
                **config["params"]
            )
            
            results[config["name"]] = result
            
            # Small delay between requests
            await asyncio.sleep(1)
        
        return results


async def main():
    """Main function to demonstrate snapshot share link creation"""
    
    print("🚀 GHL SNAPSHOT SHARE LINK CREATOR")
    print("=" * 50)
    
    # Initialize creator
    creator = SnapshotShareLinkCreator()
    
    # Check if token is configured
    if creator.agency_token == "YOUR_AGENCY_TOKEN_HERE":
        print("❌ ERROR: Please update agency_token in the script!")
        print("\n📋 How to get agency token:")
        print("1. Go to GHL Settings → Private Integrations")
        print("2. Create integration with snapshot permissions")
        print("3. Copy the token and update this script")
        return
    
    # Example snapshot ID - UPDATE THIS
    snapshot_id = "YOUR_SNAPSHOT_ID_HERE"
    
    if snapshot_id == "YOUR_SNAPSHOT_ID_HERE":
        print("\n⚠️  Please update snapshot_id with your actual snapshot ID!")
        print("\n📋 How to find snapshot ID:")
        print("1. Go to GHL Settings → Snapshots")
        print("2. Click on a snapshot")
        print("3. The ID is in the URL or snapshot details")
        return
    
    # Example 1: Create a permanent share link
    print("\n📌 Example 1: Creating Permanent Share Link")
    result = await creator.create_share_link(
        snapshot_id=snapshot_id,
        share_type="permanent_link"
    )
    
    if result["success"]:
        print(f"\n✅ You can share this link: {result['data']['shareLink']}")
    
    # Example 2: Create location-restricted link
    print("\n📌 Example 2: Creating Location-Restricted Link")
    result = await creator.create_share_link(
        snapshot_id=snapshot_id,
        share_type="location_link",
        share_location_ids=["lBPqgBowX1CsjHay12LY"]  # Nestle LLC location
    )
    
    # Example 3: Create multiple types
    print("\n📌 Example 3: Creating All Share Link Types")
    all_results = await creator.create_multiple_share_types(snapshot_id)
    
    # Summary
    print("\n📊 SUMMARY OF ALL SHARE LINKS")
    print("=" * 50)
    
    for name, result in all_results.items():
        if result["success"]:
            print(f"✅ {name}: {result['data']['shareLink']}")
        else:
            print(f"❌ {name}: Failed - {result.get('error', 'Unknown error')}")
    
    print("\n🎉 Share link creation complete!")


if __name__ == "__main__":
    asyncio.run(main())