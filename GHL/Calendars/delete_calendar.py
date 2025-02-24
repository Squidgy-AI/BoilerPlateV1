def delete_calendar(
    calendar_id,
    access_token=None,
    api_version="2021-07-28"
):
    """
    Delete a calendar configuration using the GHL API.
    
    Args:
        calendar_id (str): ID of the calendar to delete
        access_token (str, optional): Bearer token for authorization. 
                                    Defaults to Nestle_access_token from config
        api_version (str, optional): API version to use. Defaults to "2021-07-28"
        
    Returns:
        dict: JSON response from the API if successful
        
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

    url = f"{config.config.calendars_url}{calendar_id}"
    response = requests.delete(url, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        raise requests.exceptions.RequestException(
            f"Failed to delete calendar. Status code: {response.status_code}, Response: {response.json()}"
        )

# Example usage:
"""
try:
    result = delete_calendar(constant.constant.calendar_id1)
    print(result)
except requests.exceptions.RequestException as e:
    print(f"Error: {e}")
"""