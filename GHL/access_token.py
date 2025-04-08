import requests
from environment import constant, config

client_id = "673feeff6d29e38a913dc2b7-m3s5b8mt"
client_secret = "56468d3d-6927-48ab-8adc-0d8f22b4da90"
code_value = "7187472f087eec96654a9ae8cee06d017ad972b8"

payload = {
    "client_id": client_id,
    "client_secret": client_secret,
    "grant_type": "authorization_code",
    "code": code_value
}

headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "application/json"
}

try:
    response = requests.post(config.config.auth_token_url, data=payload, headers=headers)
    response.raise_for_status()
    print("Response Data:", response.json())
except requests.exceptions.HTTPError as http_err:
    print(f"HTTP error occurred: {http_err}")
    if response is not None:
        print("Response Data:", response.json())
except requests.exceptions.RequestException as req_err:
    print(f"Request error occurred: {req_err}")
