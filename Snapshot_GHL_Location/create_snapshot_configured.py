#!/usr/bin/env python3
"""
🔗 CREATE SNAPSHOT SHARE LINK - CONFIGURED VERSION
=================================================
Ready-to-use script for creating GHL snapshot share links

Configured for:
- Company: lp2p1q27DrdGta1qGDJd
- Location: lBPqgBowX1CsjHay12LY (Nestle LLC - SOMA TEST)
"""

import httpx
import asyncio
import json
from datetime import datetime


# CONFIGURATION - UPDATE THESE
# ============================
AGENCY_TOKEN = "pit-c4e9d6af-8956-4a84-9b83-554fb6801a69"  # Your agency token
SNAPSHOT_ID = "24o1XQZcg0PSD5YX1W3J"  # App to Consult snapshot (most recent)
COMPANY_ID = "lp2p1q27DrdGta1qGDJd"
LOCATION_ID = "lBPqgBowX1CsjHay12LY"

# Available snapshots:
# - 24o1XQZcg0PSD5YX1W3J: "App to Consult" (newest)
# OLD: - bInwX5BtZM6oEepAsUwo: "SOL - Solar Assistant" (2024-11-04)
# - bInwX5BtZM6oEepAsUwo: "SOL - Solar Assistant" (2025-07-06) - UPDATED
# - jnzVoI6xb6HSwnX125uP: "The Ai Team"


async def create_snapshot_share_link(
    snapshot_id: str,
    share_type: str = "permanent_link",
    agency_numbers: list = None,
    location_ids: list = None
):
    """Create a share link for a snapshot"""
    
    print(f"\n🔗 Creating {share_type} for snapshot: {snapshot_id}")
    
    # Headers
    headers = {
        "Authorization": f"Bearer {AGENCY_TOKEN}",
        "Version": "2021-07-28",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    # Build request body
    body = {
        "snapshot_id": snapshot_id,
        "share_type": share_type
    }
    
    # Add optional parameters
    if share_type == "agency_link" and agency_numbers:
        body["relationship_number"] = ",".join(agency_numbers)
        
    if share_type == "location_link" and location_ids:
        body["share_location_id"] = ",".join(location_ids)
    
    # URL with company ID
    url = f"https://services.leadconnectorhq.com/snapshots/share/link?companyId={COMPANY_ID}"
    
    print(f"📡 POST {url}")
    print(f"📦 Body: {json.dumps(body, indent=2)}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=body)
        
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            print(f"✅ Success!")
            print(f"🔗 Share Link: {data.get('shareLink')}")
            print(f"🆔 Share ID: {data.get('id')}")
            return data
        else:
            print(f"❌ Failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"💥 Error: {e}")
        return None


async def main():
    """Create different types of share links"""
    
    print("🚀 GHL SNAPSHOT SHARE LINK CREATOR")
    print("=" * 50)
    print(f"Company ID: {COMPANY_ID}")
    print(f"Location ID: {LOCATION_ID}")
    print(f"Token: {AGENCY_TOKEN[:25]}...")
    
    if SNAPSHOT_ID == "YOUR_SNAPSHOT_ID_HERE":
        print("\n❌ ERROR: Please update SNAPSHOT_ID in this script!")
        print("\nHow to find your snapshot ID:")
        print("1. Login to GHL")
        print("2. Go to Settings → Snapshots")
        print("3. Click on your snapshot")
        print("4. Copy the ID from the URL or details")
        return
    
    # Create different share link types
    print("\n" + "="*50)
    print("Creating Various Share Link Types...")
    print("="*50)
    
    # 1. Standard Link
    print("\n1️⃣ Standard Share Link")
    await create_snapshot_share_link(
        snapshot_id=SNAPSHOT_ID,
        share_type="link"
    )
    
    await asyncio.sleep(1)
    
    # 2. Permanent Link (Most Common)
    print("\n2️⃣ Permanent Share Link")
    result = await create_snapshot_share_link(
        snapshot_id=SNAPSHOT_ID,
        share_type="permanent_link"
    )
    
    await asyncio.sleep(1)
    
    # 3. Location-Restricted Link
    print("\n3️⃣ Location-Restricted Link (Nestle LLC only)")
    await create_snapshot_share_link(
        snapshot_id=SNAPSHOT_ID,
        share_type="location_link",
        location_ids=[LOCATION_ID]
    )
    
    await asyncio.sleep(1)
    
    # 4. Agency-Restricted Link
    print("\n4️⃣ Agency-Restricted Link")
    await create_snapshot_share_link(
        snapshot_id=SNAPSHOT_ID,
        share_type="agency_link",
        agency_numbers=["0-128-926"]  # Example agency number
    )
    
    print("\n" + "="*50)
    print("🎉 Share link creation complete!")
    print("="*50)
    
    if result:
        print(f"\n📋 Quick Copy:")
        print(f"Share this link: {result.get('shareLink')}")


if __name__ == "__main__":
    asyncio.run(main())