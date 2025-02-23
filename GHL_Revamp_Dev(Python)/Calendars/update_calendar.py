import requests
import json
from environment import config, constant

eventType = "RoundRobin_OptimizeForAvailability"
eventName = f"calendar for {constant.constant.kitkat_id} and {constant.constant.nescafe_id}"
description = "this is used for testing"
slug = "test1"
widgetSlug = "test1"
calendarType = "round_robin"
widgetType = "classic"
eventTitle = f"{constant.constant.nescafe_id} Calling in {constant.constant.kitkat_id}"
eventColor = "#039be5"
slotDuration = 30
slotBuffer = 0
slotInterval = 30
preBuffer = 0
appointmentPerSlot = 1
appointmentPerDay = 0
allowBookingAfter = 0
daysOfTheWeek = [2]

payload = {
    "locationId": constant.constant.location_id,
    "teamMembers": [
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
    ],
    "eventType": eventType,
    "name": eventName,
    "description": description,
    "slug": slug,
    "widgetSlug": widgetSlug,
    "calendarType": calendarType,
    "widgetType": widgetType,
    "eventTitle": eventTitle,
    "eventColor": eventColor,
    "meetingLocation": "string",
    "slotDuration": slotDuration,
    "slotDurationUnit": "mins",
    "slotInterval": slotInterval,
    "slotIntervalUnit": "mins",
    "slotBuffer": slotBuffer,
    "slotBufferUnit": "mins",
    "preBuffer": preBuffer,
    "preBufferUnit": "mins",
    "appointmentPerSlot": appointmentPerSlot,
    "appointmentPerDay": appointmentPerDay,
    "allowBookingAfter": allowBookingAfter,
    "allowBookingAfterUnit": "hours",
    "allowBookingFor": 0,
    "allowBookingForUnit": "days",
    "openHours": [
        {
            "daysOfTheWeek": daysOfTheWeek,
            "hours": [
                {
                    "openHour": 0,
                    "openMinute": 0,
                    "closeHour": 0,
                    "closeMinute": 0
                }
            ]
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
    "availabilities": [
        {
            "date": "2024-11-23T00:00:00.000Z",
            "hours": [
                {
                    "openHour": 11,
                    "openMinute": 30,
                    "closeHour": 12,
                    "closeMinute": 30
                }
            ],
            "deleted": False
        }
    ],
    "guestType": "count_only",
    "consentLabel": "string",
    "lookBusyConfig": {
        "enabled": True,
        "LookBusyPercentage": 0
    }
}

headers = {
    "Authorization": f"Bearer {config.config.Nestle_access_token}",
    "Version": "2021-04-15",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

response = requests.put(f"{config.config.calendars_url}{constant.constant.calendar_id1}", headers=headers, data=json.dumps(payload))

if response.status_code == 200:
    print(response.json())
else:
    print(f"Error: {response.status_code}")
    print(response.json())