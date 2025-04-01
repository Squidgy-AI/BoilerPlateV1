def get_all_contacts(
    location_id: str = None,
    access_token: str = None,
    api_version: str = "2021-07-28"
):
    """
    Retrieve all contacts for a specific location using the GHL API.
    
    Args:
        location_id (str, optional): Location ID to filter contacts. 
                                   Defaults to constant.constant.location_id
        access_token (str, optional): Bearer token for authorization. 
                                    Defaults to Nestle_contacts_convo_token from config
        api_version (str, optional): API version to use. Defaults to "2021-07-28"
        
    Returns:
        dict: JSON response from the API containing contacts if successful
        
    Raises:
        requests.exceptions.RequestException: If the API request fails
        ValueError: If required config values are missing
    """
    import requests
    from GHL.environment import config, constant
    
    # Set default location_id if not provided
    if location_id is None:
        location_id = getattr(constant.constant, 'location_id', None)
        if location_id is None:
            raise ValueError("location_id must be provided either as parameter or in constants")
    
    # Use default access token if none provided
    if access_token is None:
        access_token = getattr(config.config, 'Nestle_contacts_convo_token', None)
        if access_token is None:
            raise ValueError("access_token must be provided either as parameter or in config")
        
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Version": api_version,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    params = {
        "locationId": location_id
    }

    try:
        contacts_url = config.config.contacts_url
    except AttributeError:
        raise ValueError("contacts_url must be defined in config")

    response = requests.get(contacts_url, headers=headers, params=params)
    
    if response.status_code == 200:
        return response.json()
    else:
        raise requests.exceptions.RequestException(
            f"Failed to retrieve contacts. Status code: {response.status_code}, Response: {response.json()}"
        )