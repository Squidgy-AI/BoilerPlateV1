#!/usr/bin/env python3
"""
🌞 CREATE SHARE LINKS FOR SOL - SOLAR ASSISTANT SNAPSHOT
=======================================================
Creates share links for the existing Solar Assistant snapshot
Snapshot ID: 7oAH6Cmto5ZcWAaEsrrq (from location JUTFTny8EXQOSB5NcvAA)
"""

import httpx
import asyncio
import json


# CONFIGURATION
AGENCY_TOKEN = "pit-c4e9d6af-8956-4a84-9b83-554fb6801a69"
COMPANY_ID = "lp2p1q27DrdGta1qGDJd"

# SOLAR ASSISTANT SNAPSHOT
SOLAR_SNAPSHOT_ID = "7oAH6Cmto5ZcWAaEsrrq"  # SOL - Solar Assistant
SOLAR_LOCATION_ID = "JUTFTny8EXQOSB5NcvAA"  # Original location (DO NOT MODIFY!)

# TEST LOCATION (COMMENTED OUT AS REQUESTED)
# TEST_LOCATION_ID = "lBPqgBowX1CsjHay12LY"  # Nestle LLC - SOMA TEST


async def create_solar_share_links():
    """Create share links for the Solar Assistant snapshot"""
    
    print("🌞 SOLAR ASSISTANT SNAPSHOT SHARE LINKS")
    print("=" * 60)
    print(f"Snapshot ID: {SOLAR_SNAPSHOT_ID}")
    print(f"Original Location: {SOLAR_LOCATION_ID} (The Ai Team - Solar)")
    print(f"Snapshot Name: SOL - Solar Assistant")
    print(f"Components: 26/26 completed")
    print("=" * 60)
    
    headers = {
        "Authorization": f"Bearer {AGENCY_TOKEN}",
        "Version": "2021-07-28",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    # Create different types of share links
    share_configs = [
        {
            "name": "Standard Link",
            "type": "link",
            "description": "Basic share link with standard expiration"
        },
        {
            "name": "Permanent Link",
            "type": "permanent_link", 
            "description": "Never expires - recommended for testing"
        },
        {
            "name": "Location-Restricted Link", 
            "type": "location_link",
            "description": "Only works for specific test location",
            "share_location_id": "lBPqgBowX1CsjHay12LY"  # Nestle test location
        }
    ]
    
    created_links = []
    
    for config in share_configs:
        print(f"\n🔗 Creating {config['name']}...")
        print(f"   Purpose: {config['description']}")
        
        # Build request body
        body = {
            "snapshot_id": SOLAR_SNAPSHOT_ID,
            "share_type": config["type"]
        }
        
        # Add location restriction if specified
        if config.get("share_location_id"):
            body["share_location_id"] = config["share_location_id"]
        
        # Create share link
        url = f"https://services.leadconnectorhq.com/snapshots/share/link?companyId={COMPANY_ID}"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=body)
            
            if response.status_code == 201:
                data = response.json()
                share_link = data.get('shareLink')
                share_id = data.get('id')
                
                print(f"   ✅ Success!")
                print(f"   🔗 Link: {share_link}")
                print(f"   🆔 ID: {share_id}")
                
                created_links.append({
                    "name": config["name"],
                    "type": config["type"],
                    "link": share_link,
                    "id": share_id,
                    "description": config["description"]
                })
            else:
                print(f"   ❌ Failed: {response.status_code}")
                print(f"   Error: {response.text[:100]}...")
                
        except Exception as e:
            print(f"   💥 Error: {str(e)}")
        
        # Small delay between requests
        await asyncio.sleep(1)
    
    return created_links


async def show_testing_instructions(links):
    """Show instructions for testing the snapshot"""
    
    print("\n" + "=" * 80)
    print("🧪 TESTING INSTRUCTIONS")
    print("=" * 80)
    
    print("\n📋 WHAT THIS SNAPSHOT CONTAINS:")
    print("✓ All workflows and automations from Solar Assistant")
    print("✓ Pipelines and stages for solar leads")
    print("✓ Custom fields for solar data")
    print("✓ Email/SMS templates for solar outreach")
    print("✓ Forms and surveys for solar qualification")
    print("✓ Funnels and websites for solar landing pages")
    print("✓ Calendars for solar consultations")
    print("✓ Tags for solar lead management")
    print("✓ All other configured components")
    
    print("\n⚠️ WHAT'S NOT INCLUDED:")
    print("❌ Contacts (actual customer data)")
    print("❌ Conversations history")
    print("❌ Actual appointments")
    print("❌ Payment transactions")
    
    print("\n🎯 HOW TO TEST THE SNAPSHOT:")
    print("1. Create a NEW test location in GHL")
    print("2. Use one of the share links below to import")
    print("3. Check that all components imported correctly:")
    print("   • Go to Workflows - verify solar automations")
    print("   • Go to Pipelines - verify solar stages")
    print("   • Go to Custom Fields - verify solar fields")
    print("   • Go to Templates - verify solar emails/SMS")
    print("   • Go to Forms - verify solar qualification forms")
    print("   • Go to Funnels - verify solar landing pages")
    print("   • Go to Calendars - verify solar booking calendars")
    
    print("\n🔗 SHARE LINKS TO USE:")
    for link in links:
        print(f"\n📎 {link['name']}:")
        print(f"   Link: {link['link']}")
        print(f"   Use: {link['description']}")
    
    print("\n⚠️ SAFETY NOTES:")
    print("• Original location JUTFTny8EXQOSB5NcvAA was NOT modified")
    print("• These are READ-ONLY share links")
    print("• Import into a TEST location only")
    print("• Original Solar Assistant remains completely intact")


async def main():
    """Main function"""
    
    print("🚀 SOLAR ASSISTANT SNAPSHOT SHARE LINK CREATOR")
    print("=" * 80)
    
    # Create share links
    links = await create_solar_share_links()
    
    if links:
        print(f"\n✅ Created {len(links)} share links successfully!")
        
        # Show testing instructions
        await show_testing_instructions(links)
        
        print("\n🎉 READY FOR TESTING!")
        print("You can now import the Solar Assistant snapshot into a test location")
        print("to verify all components are working correctly.")
    else:
        print("\n❌ No share links were created")


if __name__ == "__main__":
    asyncio.run(main())