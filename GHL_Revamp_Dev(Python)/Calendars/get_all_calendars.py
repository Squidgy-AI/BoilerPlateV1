import requests
from environment import config, constant


headers = {
    "Authorization": f"Bearer {config.config.Nestle_access_token}",
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

response = requests.get(config.config.calendars_url, headers=headers)

if response.status_code == 200:
    print(response.json())
else:
    print(f"Error: {response.status_code}")
    print(response.json())