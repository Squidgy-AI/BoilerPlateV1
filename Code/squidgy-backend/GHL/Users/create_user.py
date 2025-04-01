def create_user(
    first_name: str,
    last_name: str,
    email: str,
    password: str,
    phone_number: str,
    account_type: str = "account",
    role: str = "user",
    company_id: str = None,
    location_ids: list = None,
    permissions: dict = None,
    scopes: list = None,
    scopes_assigned_to_only: list = None,
    access_token: str = None
):
    """
    Create a new user using the GHL API.
    
    Args:
        first_name (str): User's first name
        last_name (str): User's last name
        email (str): User's email address
        password (str): User's password
        phone_number (str): User's phone number with country code
        account_type (str, optional): Type of account. Defaults to "account"
        role (str, optional): User role. Defaults to "user"
        company_id (str, optional): Company ID. Defaults to constant.constant.Company_Id
        location_ids (list, optional): List of location IDs. Defaults to [constant.constant.location_id]
        permissions (dict, optional): Dictionary of user permissions. Defaults to preset permissions
        scopes (list, optional): List of permission scopes. Defaults to preset scopes
        scopes_assigned_to_only (list, optional): List of assigned-only scopes. Defaults to preset scopes
        access_token (str, optional): Bearer token for authorization
        
    Returns:
        dict: JSON response from the API if successful
        
    Raises:
        requests.exceptions.RequestException: If the API request fails
    """
    import requests
    import json
    from GHL.environment import config, constant
    
    # Set default values from constants if not provided
    if company_id is None:
        company_id = constant.constant.Company_Id
        
    if location_ids is None:
        location_ids = [constant.constant.location_id]
        
    if access_token is None:
        access_token = constant.constant.Agency_Access_Key
    
    if permissions is None:
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
    
    if scopes is None:
        scopes = [
            "campaigns.readonly", "campaigns.write", "calendars/events.write",
            "calendars/events.readonly", "contacts.write", "contacts/bulkActions.write",
            "workflows.readonly", "workflows.write", "triggers.write", "funnels.write",
            "websites.write", "opportunities.write", "opportunities/leadValue.readonly",
            "reporting/phone.readonly", "reporting/adwords.readonly",
            "reporting/facebookAds.readonly", "reporting/attributions.readonly",
            "reporting/agent.readonly", "payments.write", "payments/refunds.write",
            "payments/records.write", "payments/exports.write",
            "payments/subscriptionsCancel.write", "invoices.write", "invoices.readonly",
            "invoices/schedule.readonly", "invoices/schedule.write",
            "invoices/template.readonly", "invoices/template.write",
            "reputation/review.write", "reputation/listing.write", "conversations.write",
            "conversations.readonly", "conversations/message.readonly",
            "conversations/message.write", "contentAI.write", "dashboard/stats.readonly",
            "locations/tags.write", "locations/tags.readonly", "marketing.write",
            "eliza.write", "settings.write", "socialplanner/post.write",
            "marketing/affiliate.write", "blogs.write", "membership.write",
            "communities.write", "certificates.write", "certificates.readonly",
            "adPublishing.write", "adPublishing.readonly"
        ]
    
    if scopes_assigned_to_only is None:
        scopes_assigned_to_only = scopes.copy()  # Use the same scopes by default

    payload = {
        "companyId": company_id,
        "firstName": first_name,
        "lastName": last_name,
        "email": email,
        "password": password,
        "phone": phone_number,
        "type": account_type,
        "role": role,
        "locationIds": location_ids,
        "permissions": permissions,
        "scopes": scopes,
        "scopesAssignedToOnly": scopes_assigned_to_only
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Version": "2021-07-28",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    response = requests.post(
        config.config.users_url,
        headers=headers,
        data=json.dumps(payload)
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        raise requests.exceptions.RequestException(
            f"Failed to create user. Status code: {response.status_code}, Response: {response.json()}"
        )

# Example usage:
"""
try:
    result = create_user(
        first_name='Mohnishkumar',
        last_name='Rajkumar',
        email='mkr@gmail.com',
        password='Mohnishkumar$123',
        phone_number='+44123456789'
    )
    print("Response Data:", result)
except requests.exceptions.RequestException as e:
    print(f"Error: {e}")
"""