def create_contact(
    first_name: str,
    last_name: str,
    email: str,
    phone: str,
    location_id: str = None,
    gender: str = None,
    address1: str = None,
    city: str = None,
    state: str = None,
    postal_code: str = None,
    website: str = None,
    timezone: str = "America/Chihuahua",
    dnd: bool = True,
    country: str = "US",
    company_name: str = None,
    assigned_to: str = None,
    tags: list = None,
    source: str = "public api",
    access_token: str = None
):
    """
    Create a new contact using the GHL API.
    
    Args:
        first_name (str): First name of the contact
        last_name (str): Last name of the contact
        email (str): Email address of the contact
        phone (str): Phone number with country code (e.g., "+4412344578")
        location_id (str, optional): Location ID. Defaults to constant.constant.location_id
        gender (str, optional): Gender of the contact ("male" or "female")
        address1 (str, optional): Street address
        city (str, optional): City name
        state (str, optional): State code
        postal_code (str, optional): Postal/ZIP code
        website (str, optional): Website URL
        timezone (str, optional): Timezone. Defaults to "America/Chihuahua"
        dnd (bool, optional): Do Not Disturb flag. Defaults to True
        country (str, optional): Country code. Defaults to "US"
        company_name (str, optional): Company name
        assigned_to (str, optional): User ID to assign contact to
        tags (list, optional): List of tags to apply to the contact
        source (str, optional): Source of the contact. Defaults to "public api"
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
    if location_id is None:
        location_id = constant.constant.location_id
    
    if assigned_to is None:
        assigned_to = constant.constant.kitkat_id
        
    if access_token is None:
        access_token = config.config.Nestle_contacts_convo_token
        
    if tags is None:
        tags = ["nisi sint commodo amet", "consequat"]
        
    # Construct full name
    name = f"{first_name} {last_name}"
    
    payload = {
        "firstName": first_name,
        "lastName": last_name,
        "name": name,
        "email": email,
        "locationId": location_id,
        "phone": phone,
        "timezone": timezone,
        "dnd": dnd,
        "country": country,
        "source": source,
        "assignedTo": assigned_to
    }
    
    # Add optional fields if provided
    if gender:
        payload["gender"] = gender
    if address1:
        payload["address1"] = address1
    if city:
        payload["city"] = city
    if state:
        payload["state"] = state
    if postal_code:
        payload["postalCode"] = postal_code
    if website:
        payload["website"] = website
    if company_name:
        payload["companyName"] = company_name
    if tags:
        payload["tags"] = tags
        
    # Add DND settings
    payload["dndSettings"] = {
        service: {
            "status": "active",
            "message": "string",
            "code": "string"
        } for service in ["Call", "Email", "SMS", "WhatsApp", "GMB", "FB"]
    }
    
    payload["inboundDndSettings"] = {
        "all": {
            "status": "active",
            "message": "string"
        }
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Version": "2021-07-28",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    response = requests.post(config.config.contacts_url, headers=headers, data=json.dumps(payload))
    
    if response.status_code == 200:
        return response.json()
    else:
        raise requests.exceptions.RequestException(
            f"Failed to create contact. Status code: {response.status_code}, Response: {response.json()}"
        )