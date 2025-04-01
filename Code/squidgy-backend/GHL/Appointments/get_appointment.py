def get_appointment(
    event_id: str,
    access_key: str = None,
    api_version: str = "2021-07-28"
):
    """
    Retrieve appointment details using the GHL API.
    
    Args:
        event_id (str): ID of the event/appointment to retrieve
        access_key (str, optional): Agency access key for authorization. 
                                  Defaults to constant.constant.Agency_Access_Key
        api_version (str, optional): API version to use. Defaults to "2021-07-28"
        
    Returns:
        dict: JSON response from the API if successful
        
    Raises:
        requests.exceptions.RequestException: If the API request fails
    """
    import requests
    from GHL.environment import config, constant
    
    # Use default access key if none provided
    if access_key is None:
        access_key = constant.constant.Agency_Access_Key
        
    headers = {
        "Authorization": f"Bearer {access_key}",
        "Version": api_version,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    url = f"{config.config.appointment_url}{event_id}"
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        raise requests.exceptions.RequestException(
            f"Failed to retrieve appointment. Status code: {response.status_code}, Response: {response.json()}"
        )