def create_appointment(
    start_time: str,
    end_time: str,
    calendar_id: str = None,
    location_id: str = None,
    contact_id: str = None,
    assigned_user_id: str = None,
    title: str = None,
    address: str = "Zoom",
    meeting_location_type: str = "default",
    appointment_status: str = "new",
    ignore_date_range: bool = False,
    to_notify: bool = False,
    access_token: str = None
):
    """
    Create an appointment using the GHL API.
    
    Args:
        start_time (str): Start time in ISO format with timezone (e.g. "2024-11-27T05:30:00+05:30")
        end_time (str): End time in ISO format with timezone
        calendar_id (str, optional): ID of the calendar. Defaults to constant.constant.calendar_id1
        location_id (str, optional): ID of the location. Defaults to constant.constant.location_id
        contact_id (str, optional): ID of the contact. Defaults to constant.constant.contact_id
        assigned_user_id (str, optional): ID of the assigned user. Defaults to constant.constant.kitkat_id
        title (str, optional): Title of the appointment. If None, will use default format with contact_id
        address (str, optional): Address of the meeting. Defaults to "Zoom"
        meeting_location_type (str, optional): Type of meeting location. Defaults to "default"
        appointment_status (str, optional): Status of appointment. Defaults to "new"
        ignore_date_range (bool, optional): Whether to ignore date range. Defaults to False
        to_notify (bool, optional): Whether to send notifications. Defaults to False
        access_token (str, optional): Bearer token for authorization. If None, uses Nestle_access_token
        
    Returns:
        dict: JSON response from the API if successful
        
    Raises:
        requests.exceptions.RequestException: If the API request fails
    """
    import requests
    import json
    from GHL.environment import config, constant
    
    # Set default values from constants if not provided
    calendar_id = calendar_id or constant.constant.calendar_id1
    location_id = location_id or constant.constant.location_id
    contact_id = contact_id or constant.constant.contact_id
    assigned_user_id = assigned_user_id or constant.constant.kitkat_id
    
    if title is None:
        title = f"Event with {contact_id}"
        
    if access_token is None:
        access_token = config.config.Nestle_access_token
        
    payload = {
        "calendarId": calendar_id,
        "locationId": location_id,
        "contactId": contact_id,
        "startTime": start_time,
        "endTime": end_time,
        "title": title,
        "meetingLocationType": meeting_location_type,
        "appointmentStatus": appointment_status,
        "assignedUserId": assigned_user_id,
        "address": address,
        "ignoreDateRange": ignore_date_range,
        "toNotify": to_notify
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Version": "2021-04-15",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    response = requests.post(config.config.appointment_url, headers=headers, data=json.dumps(payload))
    
    if response.status_code == 200:
        return response.json()
    else:
        raise requests.exceptions.RequestException(
            f"Failed to create appointment. Status code: {response.status_code}, Response: {response.json()}"
        )