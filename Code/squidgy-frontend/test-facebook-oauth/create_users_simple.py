#!/usr/bin/env python3
"""
Simple user creation for GoHighLevel - without scopes
"""

import httpx
import asyncio
import json

# Configuration
TOKEN = "pit-519ac848-5b7f-4de4-acd2-bde5065493ee"
COMPANY_ID = "lp2p1q27DrdGta1qGDJd"
LOCATION_ID = "lBPqgBowX1CsjHay12LY"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

# Full permissions
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

async def create_users():
    print("🚀 CREATING USERS IN GOHIGHLEVEL")
    print("=" * 50)
    print(f"Token: {TOKEN[:25]}...")
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
            "permissions": permissions
        }

        response1 = await client.post(
            "https://services.leadconnectorhq.com/users/",
            json=jeremy_payload,
            headers=headers
        )
        
        print(f"Response Status: {response1.status_code}")
        if response1.status_code == 201:
            jeremy_data = response1.json()
            print(f"✅ Jeremy Chen created!")
            print(f"   User ID: {jeremy_data.get('id')}")
            print(f"   Full Response:")
            print(json.dumps(jeremy_data, indent=2))
        else:
            print(f"❌ Failed: {response1.text}")

        print("\n" + "="*50 + "\n")

        # Create Ovi Colton (User)
        print("2️⃣ Creating Ovi Colton (User)...")
        ovi_payload = {
            "companyId": COMPANY_ID,
            "firstName": "Ovi",
            "lastName": "Colton",
            "email": "ovi.chand@gmail.com",
            "password": "Dummy@123",
            "phone": "+18332327658",
            "type": "account",
            "role": "user",
            "locationIds": [LOCATION_ID],
            "permissions": permissions
        }

        response2 = await client.post(
            "https://services.leadconnectorhq.com/users/",
            json=ovi_payload,
            headers=headers
        )
        
        print(f"Response Status: {response2.status_code}")
        if response2.status_code == 201:
            ovi_data = response2.json()
            print(f"✅ Ovi Colton created!")
            print(f"   User ID: {ovi_data.get('id')}")
            print(f"   Full Response:")
            print(json.dumps(ovi_data, indent=2))
        else:
            print(f"❌ Failed: {response2.text}")

        print("\n" + "="*50)
        print("📊 CREATION COMPLETE")
        print("="*50)

asyncio.run(create_users())