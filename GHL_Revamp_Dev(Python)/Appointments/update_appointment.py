import requests
import json
from environment import config, constant

startTime = "2024-11-27T05:30:00+05:30"
endTime = "2024-11-27T06:30:00+05:30"
title = f"Event with {constant.constant.contact_id}"
address = "Zoom"
IGNORE_DATE_RANGE = False
TO_NOTIFY = False
appointmentStatus = "new"
IGNORE_FREE_SLOT_VALIDATION = True

event_id = "123"

update_payload = {
    "calendarId": constant.constant.calendar_id1,
    "startTime": startTime,
    "endTime": endTime,
    "title": title,
    "meetingLocationType": "default",
    "appointmentStatus": appointmentStatus,
    "assignedUserId": constant.constant.kitkat_id,
    "address": address,
    "ignoreDateRange": IGNORE_DATE_RANGE,
    "toNotify": TO_NOTIFY,
    "ignoreFreeSlotValidation": IGNORE_FREE_SLOT_VALIDATION,
    "rrule": "RRULE:FREQ=DAILY;INTERVAL=1;COUNT=5"
}

headers = {
    "Authorization": f"Bearer {config.config.Nestle_access_token}",
    "Version": "2021-04-15",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

response = requests.put(f"{config.config.appointment_url}{event_id}", headers=headers, data=json.dumps(update_payload))

if response.status_code == 200:
    print(response.json())
else:
    print(f"Error: {response.status_code}")
    print(response.json())