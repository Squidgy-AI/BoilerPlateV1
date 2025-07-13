#!/usr/bin/env python3
"""
🚀 CREATE AGENCY USERS IN GOHIGHLEVEL
=====================================
Creates users at the agency level with proper permissions

IMPORTANT: This requires an AGENCY-level token, not a location token!
"""

import httpx
import json
import asyncio

# CONFIGURATION - UPDATE THESE!
# =============================
AGENCY_TOKEN = "pit-519ac848-5b7f-4de4-acd2-bde5065493ee"  # Location access token
COMPANY_ID = "lp2p1q27DrdGta1qGDJd"      # Correct company ID from location info
LOCATION_ID = "lBPqgBowX1CsjHay12LY"     # Nestle LLC - SOMA TEST location

# API Configuration
BASE_URL = "https://services.leadconnectorhq.com/users/"

# Headers for agency-level requests
headers = {
    "Authorization": f"Bearer {AGENCY_TOKEN}",
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

# Full permissions for both users
permissions = {
    "campaignsEnabled": True,
    "campaignsReadOnly": False,
    "contactsEnabled": True,
    "workflowsEnabled": True,
    "workflowsReadOnly": False,
    "triggersEnabled": True,
    "funnelsEnabled": True,
    "websitesEnabled": True,
    "opportunitiesEnabled": True,
    "dashboardStatsEnabled": True,
    "bulkRequestsEnabled": True,
    "appointmentsEnabled": True,
    "reviewsEnabled": True,
    "onlineListingsEnabled": True,
    "phoneCallEnabled": True,
    "conversationsEnabled": True,
    "assignedDataOnly": False,
    "adwordsReportingEnabled": True,
    "membershipEnabled": True,
    "facebookAdsReportingEnabled": True,
    "attributionsReportingEnabled": True,
    "settingsEnabled": True,
    "tagsEnabled": True,
    "leadValueEnabled": True,
    "marketingEnabled": True,
    "agentReportingEnabled": True,
    "botService": True,
    "socialPlanner": True,
    "bloggingEnabled": True,
    "invoiceEnabled": True,
    "affiliateManagerEnabled": True,
    "contentAiEnabled": True,
    "refundsEnabled": True,
    "recordPaymentEnabled": True,
    "cancelSubscriptionEnabled": True,
    "paymentsEnabled": True,
    "communitiesEnabled": True,
    "exportPaymentsEnabled": True
}

# Location-level scopes (for sub-account users)
location_scopes = [
    "contacts.write",
    "contacts.readonly",
    "opportunities.write",
    "opportunities.readonly",
    "calendars.write",
    "calendars.readonly",
    "calendars/events.write",
    "calendars/events.readonly",
    "campaigns.readonly",
    "conversations.write",
    "conversations.readonly",
    "conversations/message.write",
    "conversations/message.readonly",
    "forms.write",
    "forms.readonly",
    "surveys.readonly",
    "triggers.readonly",
    "funnels.readonly",
    "websites.readonly",
    "medias.readonly",
    "medias.write",
    "workflows.readonly",
    "links.write",
    "links.readonly",
    "snapshots.readonly",
    "templates.readonly",
    "payments/orders.readonly",
    "payments/orders.write",
    "payments/transactions.readonly",
    "payments/subscriptions.readonly",
    "payments/custom-providers.readonly",
    "payments/custom-providers.write",
    "invoices.write",
    "invoices.readonly",
    "invoices/schedule.readonly",
    "invoices/schedule.write",
    "invoices/template.readonly",
    "invoices/template.write",
    "products.readonly",
    "products/prices.readonly",
    "blogs.write",
    "blogs.readonly",
    "affiliate.write",
    "affiliate.readonly",
    "businesses.write",
    "businesses.readonly",
    "locations/customFields.readonly",
    "locations/customValues.readonly",
    "locations/tasks.readonly",
    "locations/tags.readonly",
    "oauth.write",
    "oauth.readonly",
    "opportunities/leadValue.readonly",
    "reporting/phone.readonly",
    "reporting/adwords.readonly",
    "reporting/funnels.readonly",
    "reporting/revenues.readonly",
    "reporting/appointments.readonly",
    "reporting/reviews.readonly",
    "reporting/attributions.readonly",
    "marketing/agents.readonly"
]

async def create_agency_users():
    """Create users at the agency level"""
    
    print("🚀 CREATING AGENCY-LEVEL USERS")
    print("=" * 50)
    print(f"Agency Token: {AGENCY_TOKEN[:20]}...")
    print(f"Company ID: {COMPANY_ID}")
    print(f"Location ID: {LOCATION_ID}")
    print("=" * 50)
    
    async with httpx.AsyncClient() as client:
        # Create Jeremy Chen (Admin)
        print("\n1️⃣ Creating Jeremy Chen (Admin)...")
        jeremy_payload = {
            "companyId": COMPANY_ID,
            "firstName": "Jeremy",
            "lastName": "Chen",
            "email": "jeremy.chend@gmail.com",
            "password": "Dummy@123",
            "phone": "+18332327657",
            "type": "account",
            "role": "admin",
            "locationIds": [LOCATION_ID],
            "permissions": permissions,
            "scopes": location_scopes,
            "scopesAssignedToOnly": []  # Empty for full access
        }

        try:
            response1 = await client.post(BASE_URL, json=jeremy_payload, headers=headers)
            print(f"Response Status: {response1.status_code}")
            
            if response1.status_code == 201:
                jeremy_data = response1.json()
                jeremy_id = jeremy_data.get('id', 'Not found')
                print(f"✅ Jeremy Chen created successfully!")
                print(f"   User ID: {jeremy_id}")
                print(f"   Email: jeremy.chend@gmail.com")
                print(f"   Role: Admin")
                print(f"\nFull Response:")
                print(json.dumps(jeremy_data, indent=2))
            else:
                print(f"❌ Failed to create Jeremy Chen")
                print(f"   Error: {response1.text}")
                
        except Exception as e:
            print(f"❌ Exception creating Jeremy: {str(e)}")

        print("\n" + "="*50 + "\n")

        # Create Ovi Colton (User)
        print("2️⃣ Creating Ovi Colton (User)...")
        ovi_payload = {
            "companyId": COMPANY_ID,
            "firstName": "Ovi",
            "lastName": "Colton",
            "email": "ovi.chand@gmail.com",
            "password": "Dummy@123",
            "phone": "+17166044029",
            "type": "account",
            "role": "user",
            "locationIds": [LOCATION_ID],
            "permissions": permissions,
            "scopes": location_scopes,
            "scopesAssignedToOnly": []  # Empty for full access
        }

        try:
            response2 = await client.post(BASE_URL, json=ovi_payload, headers=headers)
            print(f"Response Status: {response2.status_code}")
            
            if response2.status_code == 201:
                ovi_data = response2.json()
                ovi_id = ovi_data.get('id', 'Not found')
                print(f"✅ Ovi Colton created successfully!")
                print(f"   User ID: {ovi_id}")
                print(f"   Email: ovi.chand@gmail.com")
                print(f"   Role: User")
                print(f"\nFull Response:")
                print(json.dumps(ovi_data, indent=2))
            else:
                print(f"❌ Failed to create Ovi Colton")
                print(f"   Error: {response2.text}")
                
        except Exception as e:
            print(f"❌ Exception creating Ovi: {str(e)}")

        print("\n" + "="*50)
        print("📊 CREATION SUMMARY")
        print("="*50)
        
        # Save results if successful
        results = {
            "timestamp": str(asyncio.get_event_loop().time()),
            "company_id": COMPANY_ID,
            "location_id": LOCATION_ID,
            "users_created": []
        }
        
        if 'jeremy_id' in locals():
            results["users_created"].append({
                "name": "Jeremy Chen",
                "email": "jeremy.chend@gmail.com",
                "role": "admin",
                "user_id": jeremy_id
            })
            
        if 'ovi_id' in locals():
            results["users_created"].append({
                "name": "Ovi Colton",
                "email": "ovi.chand@gmail.com",
                "role": "user",
                "user_id": ovi_id
            })
        
        if results["users_created"]:
            with open('agency_users_created.json', 'w') as f:
                json.dump(results, f, indent=2)
            print(f"\n📁 Results saved to: agency_users_created.json")

# Check if token is configured
if AGENCY_TOKEN == "YOUR_AGENCY_TOKEN_HERE":
    print("❌ ERROR: Please update AGENCY_TOKEN in this script!")
    print("\n📋 HOW TO GET AGENCY TOKEN:")
    print("1. You need an agency-level token (not a location token)")
    print("2. This might be:")
    print("   - Your main GHL account token")
    print("   - An agency API token from Settings")
    print("   - A token with agency-level permissions")
    print("\n💡 The token you provided earlier might be a location token.")
    print("   Agency tokens typically have broader permissions.")
else:
    # Run the async function
    asyncio.run(create_agency_users())