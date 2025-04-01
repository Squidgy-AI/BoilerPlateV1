def delete_contact(
    contact_id: str,
    access_token: str = None,
    api_version: str = "2021-07-28"
):
    """
    Delete a contact using the GHL API.
    
    Args:
        contact_id (str): ID of the contact to delete
        access_token (str, optional): Bearer token for authorization. 
                                    Defaults to Nestle_contacts_convo_token from config
        api_version (str, optional): API version to use. Defaults to "2021-07-28"
        
    Returns:
        dict: JSON response from the API if successful
        
    Raises:
        requests.exceptions.RequestException: If the API request fails
        ValueError: If required config values are missing
    """
    import requests
    from GHL.environment import config, constant
    
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

    try:
        contacts_url = config.config.contacts_url
    except AttributeError:
        raise ValueError("contacts_url must be defined in config")

    url = f"{contacts_url}{contact_id}"
    response = requests.delete(url, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        raise requests.exceptions.RequestException(
            f"Failed to delete contact. Status code: {response.status_code}, Response: {response.json()}"
        )