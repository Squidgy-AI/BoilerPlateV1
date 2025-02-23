import requests
import json
from environment import config, constant

firstName = "Mohnishkumar"
lastName = "Rajkumar"
name = "Mohnishkumar Rajkumar"
email = "mohnish123@email.com"
phone = "+44222344578"
address1 = "3535 1st St N"
city = "Chicago"
state = "US"
postalCode = "35061"
website = "https://www.tesla.com"
timezone = "America/Chihuahua"
DND = True
country = "US"
companyName = "DGS VolMAX"

payload = {
    "firstName": firstName,
    "lastName": lastName,
    "name": name,
    "email": email,
    "phone": phone,
    "address1": address1,
    "city": city,
    "state": state,
    "postalCode": postalCode,
    "website": website,
    "timezone": timezone,
    "dnd": DND,
    "dndSettings": {
        "Call": {
            "status": "active",
            "message": "string",
            "code": "string"
        },
        "Email": {
            "status": "active",
            "message": "string",
            "code": "string"
        },
        "SMS": {
            "status": "active",
            "message": "string",
            "code": "string"
        },
        "WhatsApp": {
            "status": "active",
            "message": "string",
            "code": "string"
        },
        "GMB": {
            "status": "active",
            "message": "string",
            "code": "string"
        },
        "FB": {
            "status": "active",
            "message": "string",
            "code": "string"
        }
    },
    "inboundDndSettings": {
        "all": {
            "status": "active",
            "message": "string"
        }
    },
    "tags": ["nisi sint commodo amet", "consequat"],
    "source": "public api",
    "country": country,
    "companyName": companyName,
    "assignedTo": constant.constant.kitkat_id
}

headers = {
    "Authorization": f"Bearer {config.config.Nestle_contacts_convo_token}",
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

contact_id = "UPCcdhjzBUVPcivkJ2vx"

response = requests.put(f"{config.config.contacts_url}{constant.constant.contact_id}", headers=headers, data=json.dumps(payload))

if response.status_code == 200:
    print(response.json())
else:
    print(f"Error: {response.status_code}")
    print(response.json())