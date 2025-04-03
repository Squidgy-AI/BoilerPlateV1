def get_all_calendars(
    access_token: str = None,
    api_version: str = "2021-07-28"
):
    """
    Retrieve all calendar configurations using the GHL API.
    
    Args:
        access_token (str, optional): Bearer token for authorization. 
                                    Defaults to Nestle_access_token from config
        api_version (str, optional): API version to use. Defaults to "2021-07-28"
        
    Returns:
        dict: JSON response from the API containing all calendars if successful
        
    Raises:
        requests.exceptions.RequestException: If the API request fails
    """
    import requests
    from GHL.environment import config, constant
    
    # Use default access token if none provided
    if access_token is None:
        access_token = config.config.Nestle_access_token
        
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Version": api_version,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    response = requests.get(config.config.calendars_url, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        raise requests.exceptions.RequestException(
            f"Failed to retrieve calendars. Status code: {response.status_code}, Response: {response.json()}"
        )