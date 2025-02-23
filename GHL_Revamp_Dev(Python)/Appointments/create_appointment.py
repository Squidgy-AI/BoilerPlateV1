import requests
import json
from environment import config, constant

Company_Id = 'lp2p1q27DrdGta1qGDJd'
Agency_Api_Key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb21wYW55X2lkIjoibHAycDFxMjdEcmRHdGExcUdESmQiLCJ2ZXJzaW9uIjoxLCJpYXQiOjE3MzE3NzMzOTIzNTgsInN1YiI6Ik11VklrS3NEVm12YnRTUlliTzRiIn0.2PIUrvtQYpmKxQXoss1IV9vdIU1VnmbDHcpFw2dodLo'
Relationship_Id = '0-099-130'
Agency_Access_Key = 'pit-ad700aa3-8481-4cff-b555-bcaac7532592'
nescafe_id = '6ZHPyo1FRlZNBGzH5szG'
maggie_id = 'Fj1JPxueiId1Ki15fZZA'

Nestle_Api_Key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6ImxCUHFnQm93WDFDc2pIYXkxMkxZIiwidmVyc2lvbiI6MSwiaWF0IjoxNzMxOTkyNDg3MDU0LCJzdWIiOiJhWjBuNGV0ck5DRUIyOXNvbmE4TSJ9.czCh27fEwqxW4KzDx0gVbYcpdtcChy_31h9SoQuptAA'
Nestle_access_token = 'pit-98e16ccd-8c1e-4e6f-a96d-57ef6cb2cf62'

startTime = "2024-11-27T05:30:00+05:30"
endTime = "2024-11-27T06:30:00+05:30"
title = f"Event with {constant.constant.contact_id}"
address = "Zoom"
IGNORE_DATE_RANGE = False
TO_NOTIFY = False
appointmentStatus = "new"

payload = {
    "calendarId": constant.constant.calendar_id1,
    "locationId": constant.constant.location_id,
    "contactId": constant.constant.contact_id,
    "startTime": startTime,
    "endTime": endTime,
    "title": title,
    "meetingLocationType": "default",
    "appointmentStatus": appointmentStatus,
    "assignedUserId": constant.constant.kitkat_id,
    "address": address,
    "ignoreDateRange": IGNORE_DATE_RANGE,
    "toNotify": TO_NOTIFY
}

headers = {
    "Authorization": f"Bearer {config.config.Nestle_access_token}",
    "Version": "2021-04-15",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

response = requests.post(config.config.appointment_url, headers=headers, data=json.dumps(payload))

if response.status_code == 200:
    print(response.json())
else:
    print(f"Error: {response.status_code}")
    print(response.json())