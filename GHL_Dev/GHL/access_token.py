import requests

url = "https://services.leadconnectorhq.com/oauth/token"

client_id = "673feeff6d29e38a913dc2b7-m3s5b8mt"
client_secret = "56468d3d-6927-48ab-8adc-0d8f22b4da90"

payload = {
    "client_id": client_id,
    "client_secret": client_secret,
    "grant_type": "authorization_code",
    "code": "7187472f087eec96654a9ae8cee06d017ad972b8"
}
headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "application/json"
}

response = requests.post(url, data=payload, headers=headers)

print(response.json())