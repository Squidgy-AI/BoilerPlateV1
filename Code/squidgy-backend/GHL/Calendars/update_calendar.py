def update_calendar(
    calendar_id,
    location_id,
    team_members,
    event_name=None,
    description="this is used for testing",
    event_type="RoundRobin_OptimizeForAvailability",
    slug="test1",
    widget_slug="test1",
    calendar_type="round_robin",
    widget_type="classic",
    event_title=None,
    event_color="#039be5",
    slot_duration=30,
    slot_buffer=0,
    slot_interval=30,
    pre_buffer=0,
    appointment_per_slot=1,
    appointment_per_day=0,
    allow_booking_after=0,
    days_of_week=None,
    custom_availabilities=None,
    access_token=None
):
    """
    Update an existing calendar configuration with team members and availability settings.
    
    Args:
        calendar_id (str): ID of the calendar to update
        location_id (str): Location ID for the calendar
        team_members (list): List of dictionaries containing team member details
        event_name (str, optional): Name of the event. Defaults to auto-generated name
        description (str, optional): Description of the calendar
        event_type (str, optional): Type of event scheduling
        slug (str, optional): URL slug for the calendar
        widget_slug (str, optional): Widget slug
        calendar_type (str, optional): Type of calendar
        widget_type (str, optional): Type of widget
        event_title (str, optional): Title format for events
        event_color (str, optional): Color code for events
        slot_duration (int, optional): Duration of each slot in minutes
        slot_buffer (int, optional): Buffer between slots in minutes
        slot_interval (int, optional): Interval between slots in minutes
        pre_buffer (int, optional): Buffer before slots in minutes
        appointment_per_slot (int, optional): Number of appointments per slot
        appointment_per_day (int, optional): Number of appointments per day (0 for unlimited)
        allow_booking_after (int, optional): Hours before allowing booking
        days_of_week (list, optional): List of days when calendar is available (1-7)
        custom_availabilities (list, optional): List of custom availability periods
        access_token (str, optional): Bearer token for authorization
        
    Returns:
        dict: JSON response from the API if successful
        
    Raises:
        requests.exceptions.RequestException: If the API request fails
    """
    import requests
    import json
    from GHL.environment import config, constant
    
    if access_token is None:
        access_token = config.config.Nestle_access_token
    
    if event_name is None:
        event_name = f"calendar for {constant.constant.kitkat_id} and {constant.constant.nescafe_id}"
    
    if event_title is None:
        event_title = f"{constant.constant.nescafe_id} Calling in {constant.constant.kitkat_id}"
    
    if days_of_week is None:
        days_of_week = [2]  # Default to Tuesday
        
    # Default availability hours structure
    default_hours = [{
        "openHour": 0,
        "openMinute": 0,
        "closeHour": 0,
        "closeMinute": 0
    }]
    
    payload = {
        "locationId": location_id,
        "teamMembers": team_members,
        "eventType": event_type,
        "name": event_name,
        "description": description,
        "slug": slug,
        "widgetSlug": widget_slug,
        "calendarType": calendar_type,
        "widgetType": widget_type,
        "eventTitle": event_title,
        "eventColor": event_color,
        "meetingLocation": "string",
        "slotDuration": slot_duration,
        "slotDurationUnit": "mins",
        "slotInterval": slot_interval,
        "slotIntervalUnit": "mins",
        "slotBuffer": slot_buffer,
        "slotBufferUnit": "mins",
        "preBuffer": pre_buffer,
        "preBufferUnit": "mins",
        "appointmentPerSlot": appointment_per_slot,
        "appointmentPerDay": appointment_per_day,
        "allowBookingAfter": allow_booking_after,
        "allowBookingAfterUnit": "hours",
        "allowBookingFor": 0,
        "allowBookingForUnit": "days",
        "openHours": [
            {
                "daysOfTheWeek": days_of_week,
                "hours": default_hours
            }
        ],
        "enableRecurring": False,
        "recurring": {
            "freq": "DAILY",
            "count": 24,
            "bookingOption": "skip",
            "bookingOverlapDefaultStatus": "confirmed"
        },
        "formId": "string",
        "stickyContact": True,
        "isLivePaymentMode": True,
        "autoConfirm": True,
        "shouldSendAlertEmailsToAssignedMember": True,
        "alertEmail": "string",
        "googleInvitationEmails": False,
        "allowReschedule": True,
        "allowCancellation": True,
        "shouldAssignContactToTeamMember": True,
        "shouldSkipAssigningContactForExisting": True,
        "notes": "string",
        "pixelId": "string",
        "formSubmitType": "ThankYouMessage",
        "formSubmitRedirectURL": "string",
        "formSubmitThanksMessage": "string",
        "availabilityType": 0,
        "guestType": "count_only",
        "consentLabel": "string",
        "lookBusyConfig": {
            "enabled": True,
            "LookBusyPercentage": 0
        }
    }
    
    # Add custom availabilities if provided
    if custom_availabilities:
        payload["availabilities"] = custom_availabilities

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Version": "2021-04-15",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    url = f"{config.config.calendars_url}{calendar_id}"
    response = requests.put(url, headers=headers, data=json.dumps(payload))
    
    if response.status_code == 200:
        return response.json()
    else:
        raise requests.exceptions.RequestException(
            f"Failed to update calendar configuration. Status code: {response.status_code}, Response: {response.json()}"
        )

# Example usage:
"""
try:
    team_members = [
        {
            "userId": constant.constant.nescafe_id,
            "priority": 0.5,
            "meetingLocationType": "custom",
            "meetingLocation": "string",
            "isPrimary": True
        },
        {
            "userId": constant.constant.kitkat_id,
            "priority": 1,
            "meetingLocationType": "custom",
            "meetingLocation": "string",
            "isPrimary": True
        }
    ]
    
    custom_availabilities = [{
        "date": "2024-11-23T00:00:00.000Z",
        "hours": [{
            "openHour": 11,
            "openMinute": 30,
            "closeHour": 12,
            "closeMinute": 30
        }],
        "deleted": False
    }]
    
    result = update_calendar_config(
        calendar_id=constant.constant.calendar_id1,
        location_id=constant.constant.location_id,
        team_members=team_members,
        custom_availabilities=custom_availabilities
    )
    print(result)
except requests.exceptions.RequestException as e:
    print(f"Error: {e}")
"""