#!/usr/bin/env python3
"""
📸 LIST GHL SNAPSHOTS - WORKING VERSION
======================================
Lists all available snapshots using the correct endpoint
"""

import httpx
import asyncio
import json
from datetime import datetime


# CONFIGURATION
AGENCY_TOKEN = "pit-c4e9d6af-8956-4a84-9b83-554fb6801a69"
COMPANY_ID = "lp2p1q27DrdGta1qGDJd"


async def list_snapshots():
    """List all available snapshots"""
    
    print("\n📸 FETCHING SNAPSHOTS")
    print("=" * 60)
    
    headers = {
        "Authorization": f"Bearer {AGENCY_TOKEN}",
        "Version": "2021-07-28",
        "Accept": "application/json"
    }
    
    # Working endpoint
    endpoint = f"https://backend.leadconnectorhq.com/snapshots/{COMPANY_ID}"
    
    print(f"🔍 Endpoint: {endpoint}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(endpoint, headers=headers)
        
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Success!")
            
            snapshots = data.get('snapshots', [])
            total_count = data.get('totalCount', 0)
            
            print(f"\n📋 Found {len(snapshots)} snapshots (Total in account: {total_count})")
            print("=" * 80)
            
            # Display snapshots
            for i, snapshot in enumerate(snapshots, 1):
                print(f"\n{i}. SNAPSHOT: {snapshot.get('name', 'Unnamed')}")
                print(f"   🆔 ID: {snapshot.get('_id')}")
                print(f"   📅 Created: {snapshot.get('dateAdded', 'N/A')}")
                print(f"   📅 Updated: {snapshot.get('dateUpdated', 'N/A')}")
                print(f"   📝 Type: {snapshot.get('type', 'N/A')}")
                print(f"   🔢 Version: {snapshot.get('version', 'N/A')}")
                
                # Additional info if available
                if snapshot.get('locationId'):
                    print(f"   📍 Location ID: {snapshot.get('locationId')}")
                
                if snapshot.get('dehydrationStatus'):
                    status = snapshot.get('dehydrationStatus', {})
                    print(f"   📊 Status: {status.get('state', 'N/A')} ({status.get('completed', 0)}/{status.get('total', 0)})")
            
            print("\n" + "="*80)
            print("💡 TO CREATE SHARE LINKS:")
            print("1. Copy the snapshot ID you want to share")
            print("2. Update SNAPSHOT_ID in create_snapshot_configured.py")
            print("3. Run: python create_snapshot_configured.py")
            
            # Show first few IDs for easy copying
            print("\n📋 Quick Copy - Snapshot IDs:")
            for snapshot in snapshots[:5]:
                print(f"   {snapshot.get('_id')} - {snapshot.get('name')}")
            
            return snapshots
            
        else:
            print(f"❌ Error: {response.text}")
            
    except Exception as e:
        print(f"💥 Error: {str(e)}")
    
    return None


async def main():
    """Main function"""
    
    print("🚀 GHL SNAPSHOT LISTER")
    print("=" * 60)
    print(f"Company ID: {COMPANY_ID}")
    print(f"Token: {AGENCY_TOKEN[:25]}...")
    
    # List all snapshots
    snapshots = await list_snapshots()
    
    if snapshots:
        print(f"\n✅ Successfully retrieved {len(snapshots)} snapshots!")
    else:
        print("\n❌ Could not retrieve snapshots")
    
    print("\n🎉 Done!")


if __name__ == "__main__":
    asyncio.run(main())