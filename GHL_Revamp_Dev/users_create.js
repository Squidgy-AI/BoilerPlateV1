const axios = require('axios');

const url = "https://services.leadconnectorhq.com/users/";

const sub_account_id = 'lBPqgBowX1CsjHay12LY';
const companyId = 'lp2p1q27DrdGta1qGDJd';
const Agency_Access_Key = 'pit-ad700aa3-8481-4cff-b555-bcaac7532592';
const firstName = 'GRAPE LLC';
const lastName = 'Soma -Test';
const email = 'GRAPE LLC';
const password = '';
const phoneNumber = 'Soma -Test';
const accountType = 'GRAPE LLC';
const role = 'Soma -Test';

const CAMPAIGNS_ENABLED = true;
const CAMPAIGNS_READ_ONLY = false;
const CONTACTS_ENABLED = true;
const WORKFLOWS_ENABLED = true;
const WORKFLOWS_READ_ONLY = true;
const TRIGGERS_ENABLED = true;
const FUNNELS_ENABLED = true;
const WEBSITES_ENABLED = false;
const OPPORTUNITIES_ENABLED = true;
const DASHBOARD_STATS_ENABLED = true;
const BULK_REQUESTS_ENABLED = true;
const APPOINTMENTS_ENABLED = true;
const REVIEWS_ENABLED = true;
const ONLINE_LISTINGS_ENABLED = true;
const PHONE_CALL_ENABLED = true;
const CONVERSATIONS_ENABLED = true;
const ASSIGNED_DATA_ONLY = false;
const ADWORDS_REPORTING_ENABLED = false;
const MEMBERSHIP_ENABLED = false;
const FACEBOOK_ADS_REPORTING_ENABLED = false;
const ATTRIBUTIONS_REPORTING_ENABLED = false;
const SETTINGS_ENABLED = true;
const TAGS_ENABLED = true;
const LEAD_VALUE_ENABLED = true;
const MARKETING_ENABLED = true;
const AGENT_REPORTING_ENABLED = true;
const BOT_SERVICE = false;
const SOCIAL_PLANNER = true;
const BLOGGING_ENABLED = true;
const INVOICE_ENABLED = true;
const AFFILIATE_MANAGER_ENABLED = true;
const CONTENT_AI_ENABLED = true;
const REFUNDS_ENABLED = true;
const RECORD_PAYMENT_ENABLED = true;
const CANCEL_SUBSCRIPTION_ENABLED = true;
const PAYMENTS_ENABLED = true;
const COMMUNITIES_ENABLED = true;
const EXPORT_PAYMENTS_ENABLED = true;




const payload = {
    companyId: companyId,
    firstName: firstName,
    lastName: lastName,
    email: email,
    password: password,
    phone: phoneNumber,
    type:accountType,
    role: role,
    locationIds: [sub_account_id],
    permissions: {
        campaignsEnabled: CAMPAIGNS_ENABLED,
        campaignsReadOnly: CAMPAIGNS_READ_ONLY,
        contactsEnabled: CONTACTS_ENABLED,
        workflowsEnabled: WORKFLOWS_ENABLED,
        workflowsReadOnly: WORKFLOWS_READ_ONLY,
        triggersEnabled: TRIGGERS_ENABLED,
        funnelsEnabled: FUNNELS_ENABLED,
        websitesEnabled: WEBSITES_ENABLED,
        opportunitiesEnabled: OPPORTUNITIES_ENABLED,
        dashboardStatsEnabled: DASHBOARD_STATS_ENABLED,
        bulkRequestsEnabled: BULK_REQUESTS_ENABLED,
        appointmentsEnabled: APPOINTMENTS_ENABLED,
        reviewsEnabled: REVIEWS_ENABLED,
        onlineListingsEnabled: ONLINE_LISTINGS_ENABLED,
        phoneCallEnabled: PHONE_CALL_ENABLED,
        conversationsEnabled: CONVERSATIONS_ENABLED,
        assignedDataOnly: ASSIGNED_DATA_ONLY,
        adwordsReportingEnabled: ADWORDS_REPORTING_ENABLED,
        membershipEnabled: MEMBERSHIP_ENABLED,
        facebookAdsReportingEnabled: FACEBOOK_ADS_REPORTING_ENABLED,
        attributionsReportingEnabled: ATTRIBUTIONS_REPORTING_ENABLED,
        settingsEnabled: SETTINGS_ENABLED,
        tagsEnabled: TAGS_ENABLED,
        leadValueEnabled: LEAD_VALUE_ENABLED,
        marketingEnabled: MARKETING_ENABLED,
        agentReportingEnabled: AGENT_REPORTING_ENABLED,
        botService: BOT_SERVICE,
        socialPlanner: SOCIAL_PLANNER,
        bloggingEnabled: BLOGGING_ENABLED,
        invoiceEnabled: INVOICE_ENABLED,
        affiliateManagerEnabled: AFFILIATE_MANAGER_ENABLED,
        contentAiEnabled: CONTENT_AI_ENABLED,
        refundsEnabled: REFUNDS_ENABLED,
        recordPaymentEnabled: RECORD_PAYMENT_ENABLED,
        cancelSubscriptionEnabled: CANCEL_SUBSCRIPTION_ENABLED,
        paymentsEnabled: PAYMENTS_ENABLED,
        communitiesEnabled: COMMUNITIES_ENABLED,
        exportPaymentsEnabled: EXPORT_PAYMENTS_ENABLED
    },
    scopes: [
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
    scopesAssignedToOnly: [
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
};

// Define headers
const headers = {
    Authorization: `Bearer ${Agency_Access_Key}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
    Accept: "application/json"
};

// Send POST request
axios.post(url, payload, { headers })
    .then(response => {
        console.log("Response Data:", response.data);
    })
    .catch(error => {
        console.error("Error:", error.response ? error.response.data : error.message);
    });