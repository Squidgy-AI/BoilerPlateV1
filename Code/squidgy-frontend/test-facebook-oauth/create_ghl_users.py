#!/usr/bin/env python3
"""
🚀 CREATE GHL USERS SCRIPT
========================
Creates two users in GoHighLevel with specified permissions

Users to create:
1. Jeremy Chen - Admin role
2. Ovi Colton - User role

IMPORTANT: Update the bearer token before running!
"""

import requests
import json
from datetime import datetime

# Configuration
BEARER_TOKEN = "YOUR_BEARER_TOKEN_HERE"  # UPDATE THIS with your actual bearer token
COMPANY_ID = "ve9EPM428h8vShlRW1KT"
LOCATION_ID = "lBPqgBowX1CsjHay12LY"
BASE_URL = "https://services.leadconnectorhq.com/users/"

# Headers for all requests
headers = {
    "Authorization": f"Bearer {BEARER_TOKEN}",
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

# Common permissions for both users (all permissions enabled)
full_permissions = {
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

# All available scopes
all_scopes = [
    "contacts.write",
    "contacts.readonly", 
    "campaigns.readonly",
    "campaigns.write",
    "workflows.readonly",
    "workflows.write",
    "triggers.write",
    "funnels.write",
    "websites.write",
    "opportunities.write",
    "dashboardStats.read",
    "bulkRequests.write",
    "appointments.write",
    "reviews.write",
    "onlineListings.write",
    "phoneCall.write",
    "conversations.write",
    "oauth.write",
    "oauth.readonly",
    "adwordsReporting.read",
    "facebookAds.read",
    "attributions.read",
    "settings.write",
    "tags.write",
    "leadValue.write",
    "marketing.write",
    "agentReporting.read",
    "reporting.read",
    "botService.write",
    "socialPlanner.write",
    "blogging.write",
    "invoices.write",
    "affiliateManager.write", 
    "contentAi.write",
    "refunds.write",
    "recordPayment.write",
    "cancelSubscription.write",
    "payments.write",
    "communities.write",
    "exportPayments.read"
]

def create_user(user_data):
    """Create a single user in GHL"""
    print(f"\n{'='*50}")
    print(f"Creating user: {user_data['firstName']} {user_data['lastName']}")
    print(f"Email: {user_data['email']}")
    print(f"Role: {user_data['role']}")
    print(f"Type: {user_data['type']}")
    
    try:
        response = requests.post(BASE_URL, json=user_data, headers=headers)
        
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            print(f"✅ User created successfully!")
            print(f"User ID: {result.get('id', 'ID not found in response')}")
            print(f"\nFull Response:")
            print(json.dumps(result, indent=2))
            return result
        else:
            print(f"❌ Failed to create user")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error creating user: {str(e)}")
        return None

def main():
    """Main function to create both users"""
    print("🚀 GHL USER CREATION SCRIPT")
    print("="*50)
    
    # Check if bearer token is updated
    if BEARER_TOKEN == "YOUR_BEARER_TOKEN_HERE":
        print("❌ ERROR: Please update the BEARER_TOKEN in this script!")
        print("Get your bearer token from GHL Settings → Private Integrations")
        return
    
    # User 1: Jeremy Chen (Admin)
    jeremy_data = {
        "companyId": COMPANY_ID,
        "firstName": "Jeremy",
        "lastName": "Chen",
        "email": "jeremy.chend@gmail.com",
        "password": "Dummy@123",
        "phone": "+18332327657",
        "type": "account",
        "role": "admin",
        "locationIds": [LOCATION_ID],
        "permissions": full_permissions,
        "scopes": all_scopes,
        "scopesAssignedToOnly": all_scopes,
        "profilePhoto": "https://ui-avatars.com/api/?name=Jeremy+Chen&background=4CAF50&color=fff"
    }
    
    # User 2: Ovi Colton (User)
    ovi_data = {
        "companyId": COMPANY_ID,
        "firstName": "Ovi",
        "lastName": "Colton",
        "email": "ovi.chand@gmail.com",
        "password": "Dummy@123",
        "phone": "+17166044029",
        "type": "account",
        "role": "user",
        "locationIds": [LOCATION_ID],
        "permissions": full_permissions,
        "scopes": all_scopes,
        "scopesAssignedToOnly": all_scopes,
        "profilePhoto": "https://ui-avatars.com/api/?name=Ovi+Colton&background=2196F3&color=fff"
    }
    
    # Create users
    created_users = []
    
    jeremy_result = create_user(jeremy_data)
    if jeremy_result:
        created_users.append({
            "name": "Jeremy Chen",
            "email": "jeremy.chend@gmail.com",
            "role": "admin",
            "user_id": jeremy_result.get('id', 'Not found')
        })
    
    ovi_result = create_user(ovi_data)
    if ovi_result:
        created_users.append({
            "name": "Ovi Colton", 
            "email": "ovi.chand@gmail.com",
            "role": "user",
            "user_id": ovi_result.get('id', 'Not found')
        })
    
    # Summary
    print(f"\n{'='*50}")
    print("📊 CREATION SUMMARY")
    print(f"{'='*50}")
    print(f"Created {len(created_users)} out of 2 users\n")
    
    for user in created_users:
        print(f"✅ {user['name']}")
        print(f"   Email: {user['email']}")
        print(f"   Role: {user['role']}")
        print(f"   User ID: {user['user_id']}")
        print()
    
    # Save results to file
    if created_users:
        results = {
            "created_at": datetime.now().isoformat(),
            "company_id": COMPANY_ID,
            "location_id": LOCATION_ID,
            "users": created_users
        }
        
        with open('created_users_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"📁 Results saved to: created_users_results.json")

if __name__ == "__main__":
    main()