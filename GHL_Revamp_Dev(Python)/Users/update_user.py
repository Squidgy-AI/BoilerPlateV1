import requests
from environment import config, constant

first_name = "Mohnishkumar"
last_name = "Rajkumar"
email = "mkr@gmail.com"
password = "Mohnishkumar$123"
phone_number = "+44823456789"
account_type = "account"
role = "user"

permissions = {
    "campaignsEnabled": True,
    "campaignsReadOnly": False,
    "contactsEnabled": True,
    "workflowsEnabled": True,
    "workflowsReadOnly": True,
    "triggersEnabled": True,
    "funnelsEnabled": True,
    "websitesEnabled": False,
    "opportunitiesEnabled": True,
    "dashboardStatsEnabled": True,
    "bulkRequestsEnabled": True,
    "appointmentsEnabled": True,
    "reviewsEnabled": True,
    "onlineListingsEnabled": True,
    "phoneCallEnabled": True,
    "conversationsEnabled": True,
    "assignedDataOnly": False,
    "adwordsReportingEnabled": False,
    "membershipEnabled": False,
    "facebookAdsReportingEnabled": False,
    "attributionsReportingEnabled": False,
    "settingsEnabled": True,
    "tagsEnabled": True,
    "leadValueEnabled": True,
    "marketingEnabled": True,
    "agentReportingEnabled": True,
    "botService": False,
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

scopes = [
    "campaigns.readonly", "campaigns.write", "calendars/events.write", "calendars/events.readonly", "contacts.write", "contacts/bulkActions.write",
    "workflows.readonly", "workflows.write", "triggers.write", "funnels.write", "websites.write", "opportunities.write", "opportunities/leadValue.readonly",
    "reporting/phone.readonly", "reporting/adwords.readonly", "reporting/facebookAds.readonly", "reporting/attributions.readonly", "reporting/agent.readonly",
    "payments.write", "payments/refunds.write", "payments/records.write", "payments/exports.write", "payments/subscriptionsCancel.write",
    "invoices.write", "invoices.readonly", "invoices/schedule.readonly", "invoices/schedule.write", "invoices/template.readonly", "invoices/template.write",
    "reputation/review.write", "reputation/listing.write", "conversations.write", "conversations.readonly", "conversations/message.readonly", "conversations/message.write",
    "contentAI.write", "dashboard/stats.readonly", "locations/tags.write", "locations/tags.readonly", "marketing.write", "eliza.write", "settings.write",
    "socialplanner/post.write", "marketing/affiliate.write", "blogs.write", "membership.write", "communities.write", "certificates.write", "certificates.readonly",
    "adPublishing.write", "adPublishing.readonly"
]

payload = {
    "companyId": constant.constant.Company_Id,
    "firstName": first_name,
    "lastName": last_name,
    "email": email,
    "password": password,
    "phone": phone_number,
    "type": account_type,
    "role": role,
    "locationIds": [constant.constant.location_id],
    "permissions": permissions,
    "scopes": scopes,
    "scopesAssignedToOnly": scopes
}

headers = {
    "Authorization": f"Bearer {constant.constant.Agency_Access_Key}",
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

try:
    response = requests.put(f"{config.config.users_url}{constant.constant.user_id}", json=payload, headers=headers)
    response.raise_for_status()
    print("Response Data:", response.json())
except requests.exceptions.HTTPError as http_err:
    print("Error Response:", {"status": response.status_code, "statusText": response.reason})
except requests.exceptions.RequestException as req_err:
    print("Request Error:", req_err)
