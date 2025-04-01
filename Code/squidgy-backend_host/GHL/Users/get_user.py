def get_user(
    user_id: str = None,
    access_token: str = None
):
    """
    Retrieve a specific user's details using the GHL API.
    
    Args:
        user_id (str, optional): ID of the user to retrieve. 
            Defaults to constant.constant.user_id
        access_token (str, optional): Bearer token for authorization. 
            Defaults to constant.constant.Agency_Access_Key
        
    Returns:
        dict: JSON response from the API containing user details if successful
        
    Raises:
        requests.exceptions.RequestException: If the API request fails
    """
    import requests
    from GHL.environment import config, constant
    
    # Set default values from constants if not provided
    if user_id is None:
        user_id = constant.constant.user_id
        
    if access_token is None:
        access_token = constant.constant.Agency_Access_Key

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Version": "2021-07-28",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    response = requests.get(
        f"{config.config.users_url}{user_id}",
        headers=headers
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        raise requests.exceptions.RequestException(
            f"Failed to retrieve user details. Status code: {response.status_code}, Response: {response.json()}"
        )

# Example usage:
"""
try:
    result = get_user()
    print(result)
except requests.exceptions.RequestException as e:
    print(f"Error: {e}")
"""