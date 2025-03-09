def update_sub_acc(
    location_id: str,
    client_name: str,
    phone_number: str,
    address: str,
    city: str,
    state: str,
    country: str,
    postal_code: str,
    website: str,
    timezone: str,
    prospect_first_name: str,
    prospect_last_name: str,
    prospect_email: str,
    company_id: str = None,
    allow_duplicate_contact: bool = False,
    allow_duplicate_opportunity: bool = False,
    allow_facebook_name_merge: bool = False,
    disable_contact_timezone: bool = False,
    social_urls: dict = None,
    access_token: str = None
):
    """
    Update an existing sub-account using the GHL API.
    
    Args:
        location_id (str): ID of the location/sub-account to update
        client_name (str): Name of the client/business
        phone_number (str): Phone number with country code
        address (str): Street address
        city (str): City name
        state (str): State name
        country (str): Country code
        postal_code (str): Postal/ZIP code
        website (str): Website URL
        timezone (str): Timezone (e.g., "US/Central")
        prospect_first_name (str): Prospect's first name
        prospect_last_name (str): Prospect's last name
        prospect_email (str): Prospect's email address
        company_id (str, optional): Company ID. Defaults to constant.constant.Company_Id
        allow_duplicate_contact (bool, optional): Allow duplicate contacts. Defaults to False
        allow_duplicate_opportunity (bool, optional): Allow duplicate opportunities. Defaults to False
        allow_facebook_name_merge (bool, optional): Allow Facebook name merge. Defaults to False
        disable_contact_timezone (bool, optional): Disable contact timezone. Defaults to False
        social_urls (dict, optional): Dictionary containing social media URLs
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
        
    if access_token is None:
        access_token = constant.constant.Agency_Access_Key
        
    if social_urls is None:
        social_urls = {
            "facebookUrl": "https://www.facebook.com/",
            "googlePlus": "https://www.googleplus.com/",
            "linkedIn": "https://www.linkedIn.com/",
            "foursquare": "https://www.foursquare.com/",
            "twitter": "https://www.twitter.com/",
            "yelp": "https://www.yelp.com/",
            "instagram": "https://www.instagram.com/",
            "youtube": "https://www.youtube.com/",
            "pinterest": "https://www.pinterest.com/",
            "blogRss": "https://www.blogRss.com/",
            "googlePlacesId": "ChIJJGPdVbQTrjsRGUkefteUeFk"
        }
    
    payload = {
        "name": client_name,
        "phone": phone_number,
        "companyId": company_id,
        "address": address,
        "city": city,
        "state": state,
        "country": country,
        "postalCode": postal_code,
        "website": website,
        "timezone": timezone,
        "prospectInfo": {
            "firstName": prospect_first_name,
            "lastName": prospect_last_name,
            "email": prospect_email
        },
        "settings": {
            "allowDuplicateContact": allow_duplicate_contact,
            "allowDuplicateOpportunity": allow_duplicate_opportunity,
            "allowFacebookNameMerge": allow_facebook_name_merge,
            "disableContactTimezone": disable_contact_timezone
        },
        "social": social_urls
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Version": "2021-07-28",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    response = requests.put(
        f"{config.config.sub_acc_url}{location_id}",
        headers=headers,
        data=json.dumps(payload)
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        raise requests.exceptions.RequestException(
            f"Failed to update sub-account. Status code: {response.status_code}, Response: {response.json()}"
        )

# Example usage:
"""
try:
    result = update_sub_account(
        location_id=constant.constant.location_id,
        client_name='Nestle LLC - MKR TEST',
        phone_number='+1410039940',
        address="4th fleet street",
        city="New York",
        state="Illinois",
        country="US",
        postal_code="567654",
        website="https://yourwebsite.com",
        timezone="US/Central",
        prospect_first_name="John",
        prospect_last_name="Doe",
        prospect_email="john.doe@mail.com"
    )
    print(result)
except requests.exceptions.RequestException as e:
    print(f"Error: {e}")
"""