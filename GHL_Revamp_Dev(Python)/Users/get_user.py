import requests
from environment import config, constant


headers = {
    "Authorization": f"Bearer {constant.constant.Agency_Access_Key}",
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
}


response = requests.get(f"{config.config.users_url}{constant.constant.user_id}", headers=headers)

if response.status_code == 200:
    print(response.json())
else:
    print(f"Error: {response.status_code}")
    print(response.json())