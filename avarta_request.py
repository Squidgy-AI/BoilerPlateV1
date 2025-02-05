import requests

api_key = "ZjljYTAwYTMxMWQ5NDYzYzkwNDgyZWQzODRlYjNmNzQtMTczODY5MTM3MQ=="
url = "https://api.heygen.com/v1/avatars"

headers = {
    "Authorization": f"Bearer {api_key}"
}

response = requests.get(url, headers=headers)

if response.status_code == 200:
    avatars = response.json()
    print(avatars)
else:
    print("Error:", response.json())
