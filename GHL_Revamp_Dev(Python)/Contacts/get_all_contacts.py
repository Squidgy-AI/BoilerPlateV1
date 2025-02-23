import requests
from environment import config, constant

headers = {
    "Authorization": f"Bearer {config.config.Nestle_contacts_convo_token}",
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

params = {
    "locationId": constant.constant.location_id,
}

response = requests.get(config.config.contacts_url, headers=headers, params=params)

if response.status_code == 200:
    print(response.json())
else:
    print(f"Error: {response.status_code}")
    print(response.json())