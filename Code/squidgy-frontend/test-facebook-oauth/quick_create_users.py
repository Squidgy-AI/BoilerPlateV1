#!/usr/bin/env python3
"""
Quick script to create Jeremy Chen and Ovi Colton users in GHL
"""

import httpx
import json
import asyncio

# UPDATE THIS WITH YOUR BEARER TOKEN!
BEARER_TOKEN = "YOUR_BEARER_TOKEN_HERE"  # Replace with your actual Private Integration token from GHL

# Configuration from your request
COMPANY_ID = "ve9EPM428h8vShlRW1KT"
LOCATION_ID = "lBPqgBowX1CsjHay12LY"
BASE_URL = "https://services.leadconnectorhq.com/users/"

headers = {
    "Authorization": f"Bearer {BEARER_TOKEN}",
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

async def create_users():
    async with httpx.AsyncClient() as client:
        # Create Jeremy Chen (Admin)
        print("Creating Jeremy Chen (Admin)...")
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

        response1 = await client.post(BASE_URL, json=jeremy_payload, headers=headers)
        print(f"Jeremy Response Status: {response1.status_code}")
        if response1.status_code == 201:
            jeremy_data = response1.json()
            print(f"✅ Jeremy Chen created! User ID: {jeremy_data.get('id', 'Not found')}")
            print(json.dumps(jeremy_data, indent=2))
        else:
            print(f"❌ Failed: {response1.text}")

        print("\n" + "="*50 + "\n")

        # Create Ovi Colton (User)
        print("Creating Ovi Colton (User)...")
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
            "permissions": permissions
        }

        response2 = await client.post(BASE_URL, json=ovi_payload, headers=headers)
        print(f"Ovi Response Status: {response2.status_code}")
        if response2.status_code == 201:
            ovi_data = response2.json()
            print(f"✅ Ovi Colton created! User ID: {ovi_data.get('id', 'Not found')}")
            print(json.dumps(ovi_data, indent=2))
        else:
            print(f"❌ Failed: {response2.text}")

# Run the async function
asyncio.run(create_users())