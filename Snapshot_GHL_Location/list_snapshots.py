#!/usr/bin/env python3
"""
📸 LIST GHL SNAPSHOTS
====================
Lists all available snapshots in your GHL account
Use this to find snapshot IDs for creating share links
"""

import httpx
import asyncio
import json
from datetime import datetime


# CONFIGURATION
AGENCY_TOKEN = "pit-e3d8d384-00cb-4744-8213-b1ab06ae71fe"  # Your agency token
COMPANY_ID = "lp2p1q27DrdGta1qGDJd"


async def list_snapshots():
    """List all available snapshots"""
    
    print("\n📸 FETCHING SNAPSHOTS")
    print("=" * 40)
    
    headers = {
        "Authorization": f"Bearer {AGENCY_TOKEN}",
        "Version": "2021-07-28",
        "Accept": "application/json"
    }
    
    # Working endpoint discovered
    endpoint = f"https://backend.leadconnectorhq.com/snapshots/{COMPANY_ID}"
        print(f"\n🔍 Trying: {endpoint}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(endpoint, headers=headers)
            
            print(f"📊 Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Success!")
                
                # Handle different response formats
                snapshots = data.get('snapshots', data.get('data', data))
                
                if isinstance(snapshots, list):
                    print(f"\n📋 Found {len(snapshots)} snapshots:")
                    print("=" * 60)
                    
                    for i, snapshot in enumerate(snapshots, 1):
                        print(f"\n{i}. Snapshot Details:")
                        print(f"   🆔 ID: {snapshot.get('id', 'N/A')}")
                        print(f"   📛 Name: {snapshot.get('name', 'N/A')}")
                        print(f"   📝 Type: {snapshot.get('type', 'N/A')}")
                        print(f"   📅 Created: {snapshot.get('createdAt', 'N/A')}")
                        print(f"   📅 Updated: {snapshot.get('updatedAt', 'N/A')}")
                        
                        # Store for easy copying
                        if i == 1:
                            first_id = snapshot.get('id')
                    
                    if snapshots and first_id:
                        print("\n" + "="*60)
                        print("💡 To create a share link, copy this ID:")
                        print(f"   {first_id}")
                        print("\nThen update SNAPSHOT_ID in create_snapshot_configured.py")
                    
                    return snapshots
                else:
                    print(f"📄 Response: {json.dumps(data, indent=2)}")
                    
            elif response.status_code == 404:
                print("❌ Endpoint not found, trying next...")
            else:
                print(f"❌ Error: {response.text[:200]}...")
                
        except Exception as e:
            print(f"💥 Error: {str(e)}")
    
    return None


async def get_snapshot_details(snapshot_id: str):
    """Get details of a specific snapshot"""
    
    print(f"\n🔍 Getting details for snapshot: {snapshot_id}")
    
    headers = {
        "Authorization": f"Bearer {AGENCY_TOKEN}",
        "Version": "2021-07-28",
        "Accept": "application/json"
    }
    
    url = f"https://services.leadconnectorhq.com/snapshots/{snapshot_id}"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Snapshot found!")
            print(f"📋 Details: {json.dumps(data, indent=2)}")
            return data
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
    
    if not snapshots:
        print("\n❌ Could not retrieve snapshots")
        print("\nPossible reasons:")
        print("1. No snapshots exist yet")
        print("2. Token doesn't have snapshot permissions")
        print("3. Wrong company ID")
        
        print("\n💡 Try creating a snapshot first:")
        print("1. Go to GHL Settings → Snapshots")
        print("2. Click 'Create Snapshot'")
        print("3. Select what to include")
        print("4. Save the snapshot")
    
    print("\n🎉 Done!")


if __name__ == "__main__":
    asyncio.run(main())