def get_user_by_location_id(
    location_id: str = None,
    access_token: str = None
):
    """
    Retrieve users for a specific location using the GHL API.
    
    Args:
        location_id (str, optional): ID of the location to get users for. 
            Defaults to constant.constant.location_id
        access_token (str, optional): Bearer token for authorization. 
            Defaults to constant.constant.Agency_Access_Key
        
    Returns:
        dict: JSON response from the API containing users list if successful
        
    Raises:
        requests.exceptions.RequestException: If the API request fails
    """
    import requests
    from GHL.environment import config, constant
    
    # Set default values from constants if not provided
    if location_id is None:
        location_id = constant.constant.location_id
        
    if access_token is None:
        access_token = constant.constant.Agency_Access_Key

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Version": "2021-07-28",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    params = {
        "locationId": location_id
    }

    response = requests.get(
        config.config.users_url,
        headers=headers,
        params=params
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        raise requests.exceptions.RequestException(
            f"Failed to retrieve users. Status code: {response.status_code}, Response: {response.json()}"
        )

# Example usage:
"""
try:
    result = get_users()
    print(result)
except requests.exceptions.RequestException as e:
    print(f"Error: {e}")
"""