import requests
import json
from environment import config, constant
firstName = 'Mohnishkumar'
lastName = 'Rajkumar'
email = 'mkr@gmail.com'
password = 'Mohnishkumar$123'
phoneNumber = '+44123456789'
accountType = 'account'
role = 'user'

CAMPAIGNS_ENABLED = True
CAMPAIGNS_READ_ONLY = False
CONTACTS_ENABLED = True
WORKFLOWS_ENABLED = True
WORKFLOWS_READ_ONLY = True
TRIGGERS_ENABLED = True
FUNNELS_ENABLED = True
WEBSITES_ENABLED = False
OPPORTUNITIES_ENABLED = True
DASHBOARD_STATS_ENABLED = True
BULK_REQUESTS_ENABLED = True
APPOINTMENTS_ENABLED = True
REVIEWS_ENABLED = True
ONLINE_LISTINGS_ENABLED = True
PHONE_CALL_ENABLED = True
CONVERSATIONS_ENABLED = True
ASSIGNED_DATA_ONLY = False
ADWORDS_REPORTING_ENABLED = False
MEMBERSHIP_ENABLED = False
FACEBOOK_ADS_REPORTING_ENABLED = False
ATTRIBUTIONS_REPORTING_ENABLED = False
SETTINGS_ENABLED = True
TAGS_ENABLED = True
LEAD_VALUE_ENABLED = True
MARKETING_ENABLED = True
AGENT_REPORTING_ENABLED = True
BOT_SERVICE = False
SOCIAL_PLANNER = True
BLOGGING_ENABLED = True
INVOICE_ENABLED = True
AFFILIATE_MANAGER_ENABLED = True
CONTENT_AI_ENABLED = True
REFUNDS_ENABLED = True
RECORD_PAYMENT_ENABLED = True
CANCEL_SUBSCRIPTION_ENABLED = True
PAYMENTS_ENABLED = True
COMMUNITIES_ENABLED = True
EXPORT_PAYMENTS_ENABLED = True

payload = {
    "companyId": constant.constant.Company_Id,
    "firstName": firstName,
    "lastName": lastName,
    "email": email,
    "password": password,
    "phone": phoneNumber,
    "type": accountType,
    "role": role,
    "locationIds": [constant.constant.location_id],
    "permissions": {
        "campaignsEnabled": CAMPAIGNS_ENABLED,
        "campaignsReadOnly": CAMPAIGNS_READ_ONLY,
        "contactsEnabled": CONTACTS_ENABLED,
        "workflowsEnabled": WORKFLOWS_ENABLED,
        "workflowsReadOnly": WORKFLOWS_READ_ONLY,
        "triggersEnabled": TRIGGERS_ENABLED,
        "funnelsEnabled": FUNNELS_ENABLED,
        "websitesEnabled": WEBSITES_ENABLED,
        "opportunitiesEnabled": OPPORTUNITIES_ENABLED,
        "dashboardStatsEnabled": DASHBOARD_STATS_ENABLED,
        "bulkRequestsEnabled": BULK_REQUESTS_ENABLED,
        "appointmentsEnabled": APPOINTMENTS_ENABLED,
        "reviewsEnabled": REVIEWS_ENABLED,
        "onlineListingsEnabled": ONLINE_LISTINGS_ENABLED,
        "phoneCallEnabled": PHONE_CALL_ENABLED,
        "conversationsEnabled": CONVERSATIONS_ENABLED,
        "assignedDataOnly": ASSIGNED_DATA_ONLY,
        "adwordsReportingEnabled": ADWORDS_REPORTING_ENABLED,
        "membershipEnabled": MEMBERSHIP_ENABLED,
        "facebookAdsReportingEnabled": FACEBOOK_ADS_REPORTING_ENABLED,
        "attributionsReportingEnabled": ATTRIBUTIONS_REPORTING_ENABLED,
        "settingsEnabled": SETTINGS_ENABLED,
        "tagsEnabled": TAGS_ENABLED,
        "leadValueEnabled": LEAD_VALUE_ENABLED,
        "marketingEnabled": MARKETING_ENABLED,
        "agentReportingEnabled": AGENT_REPORTING_ENABLED,
        "botService": BOT_SERVICE,
        "socialPlanner": SOCIAL_PLANNER,
        "bloggingEnabled": BLOGGING_ENABLED,
        "invoiceEnabled": INVOICE_ENABLED,
        "affiliateManagerEnabled": AFFILIATE_MANAGER_ENABLED,
        "contentAiEnabled": CONTENT_AI_ENABLED,
        "refundsEnabled": REFUNDS_ENABLED,
        "recordPaymentEnabled": RECORD_PAYMENT_ENABLED,
        "cancelSubscriptionEnabled": CANCEL_SUBSCRIPTION_ENABLED,
        "paymentsEnabled": PAYMENTS_ENABLED,
        "communitiesEnabled": COMMUNITIES_ENABLED,
        "exportPaymentsEnabled": EXPORT_PAYMENTS_ENABLED
    },
    "scopes": [
        "campaigns.readonly",
        "campaigns.write",
        "calendars/events.write",
        "calendars/events.readonly",
        "contacts.write",
        "contacts/bulkActions.write",
        "workflows.readonly",
        "workflows.write",
        "triggers.write",
        "funnels.write",
        "websites.write",
        "opportunities.write",
        "opportunities/leadValue.readonly",
        "reporting/phone.readonly",
        "reporting/adwords.readonly",
        "reporting/facebookAds.readonly",
        "reporting/attributions.readonly",
        "reporting/agent.readonly",
        "payments.write",
        "payments/refunds.write",
        "payments/records.write",
        "payments/exports.write",
        "payments/subscriptionsCancel.write",
        "invoices.write",
        "invoices.readonly",
        "invoices/schedule.readonly",
        "invoices/schedule.write",
        "invoices/template.readonly",
        "invoices/template.write",
        "reputation/review.write",
        "reputation/listing.write",
        "conversations.write",
        "conversations.readonly",
        "conversations/message.readonly",
        "conversations/message.write",
        "contentAI.write",
        "dashboard/stats.readonly",
        "locations/tags.write",
        "locations/tags.readonly",
        "marketing.write",
        "eliza.write",
        "settings.write",
        "socialplanner/post.write",
        "marketing/affiliate.write",
        "blogs.write",
        "membership.write",
        "communities.write",
        "certificates.write",
        "certificates.readonly",
        "adPublishing.write",
        "adPublishing.readonly"
    ],
    "scopesAssignedToOnly": [
        "campaigns.readonly",
        "campaigns.write",
        "calendars/events.write",
        "calendars/events.readonly",
        "contacts.write",
        "contacts/bulkActions.write",
        "workflows.readonly",
        "workflows.write",
        "triggers.write",
        "funnels.write",
        "websites.write",
        "opportunities.write",
        "opportunities/leadValue.readonly",
        "reporting/phone.readonly",
        "reporting/adwords.readonly",
        "reporting/facebookAds.readonly",
        "reporting/attributions.readonly",
        "reporting/agent.readonly",
        "payments.write",
        "payments/refunds.write",
        "payments/records.write",
        "payments/exports.write",
        "payments/subscriptionsCancel.write",
        "invoices.write",
        "invoices.readonly",
        "invoices/schedule.readonly",
        "invoices/schedule.write",
        "invoices/template.readonly",
        "invoices/template.write",
        "reputation/review.write",
        "reputation/listing.write",
        "conversations.write",
        "conversations.readonly",
        "conversations/message.readonly",
        "conversations/message.write",
        "contentAI.write",
        "dashboard/stats.readonly",
        "locations/tags.write",
        "locations/tags.readonly",
        "marketing.write",
        "eliza.write",
        "settings.write",
        "socialplanner/post.write",
        "marketing/affiliate.write",
        "blogs.write",
        "membership.write",
        "communities.write",
        "certificates.write",
        "certificates.readonly",
        "adPublishing.write",
        "adPublishing.readonly"
    ]
}

headers = {
    "Authorization": f"Bearer {constant.constant.Agency_Access_Key}",
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

response = requests.post(config.config.users_url, headers=headers, data=json.dumps(payload))

if response.status_code == 200:
    print("Response Data:", response.json())
else:
    print(f"Error: {response.status_code}")
    print(response.json())