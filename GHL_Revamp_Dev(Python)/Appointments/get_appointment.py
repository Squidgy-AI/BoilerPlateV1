import requests
from environment import config, constant

Agency_Access_Key = 'pit-ad700aa3-8481-4cff-b555-bcaac7532592'
event_id = "123"

headers = {
    "Authorization": f"Bearer {constant.constant.Agency_Access_Key}",
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

response = requests.get(f"{config.config.appointment_url}{event_id}", headers=headers)

if response.status_code == 200:
    print(response.json())
else:
    print(f"Error: {response.status_code}")
    print(response.json())