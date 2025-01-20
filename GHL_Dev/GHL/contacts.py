import requests

Company_Id = 'lp2p1q27DrdGta1qGDJd'
Agency_Api_Key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb21wYW55X2lkIjoibHAycDFxMjdEcmRHdGExcUdESmQiLCJ2ZXJzaW9uIjoxLCJpYXQiOjE3MzE3NzMzOTIzNTgsInN1YiI6Ik11VklrS3NEVm12YnRTUlliTzRiIn0.2PIUrvtQYpmKxQXoss1IV9vdIU1VnmbDHcpFw2dodLo'
Relationship_Id = '0-099-130'
Agency_Access_Key = 'pit-ad700aa3-8481-4cff-b555-bcaac7532592'
nescafe_id = '6ZHPyo1FRlZNBGzH5szG'
maggie_id = 'Fj1JPxueiId1Ki15fZZA'
kitkat_id = 'kmfwpeEjk5QjgGVdD4Su'
Nestle_Api_Key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6ImxCUHFnQm93WDFDc2pIYXkxMkxZIiwidmVyc2lvbiI6MSwiaWF0IjoxNzMxOTkyNDg3MDU0LCJzdWIiOiJhWjBuNGV0ck5DRUIyOXNvbmE4TSJ9.czCh27fEwqxW4KzDx0gVbYcpdtcChy_31h9SoQuptAA'
Nestle_access_token = 'pit-98e16ccd-8c1e-4e6f-a96d-57ef6cb2cf62'
Nestle_contacts_convo_token = 'pit-1fc00b1f-35e7-4a86-90c0-ccdeefd935b0'
sub_account_id = 'lBPqgBowX1CsjHay12LY'

calendar_id1 = 'nNKMeKxstubPEDQHnOW7'

url = "https://services.leadconnectorhq.com/contacts/"

payload = {
    "firstName": "Rosan",
    "lastName": "Hamam",
    "name": "Rosan Hamam",
    "email": "raghu@pothineni.com",
    "locationId": sub_account_id,
    "gender": "male",
    "phone": "+1 888-888-9999",
    "address1": "3535 1st St N",
    "city": "Chicago",
    "state": "US",
    "postalCode": "35061",
    "website": "https://www.tesla.com",
    "timezone": "America/Chihuahua",
    "dnd": True,
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
    "inboundDndSettings": { "all": {
            "status": "active",
            "message": "string"
        } },
    "tags": ["nisi sint commodo amet", "consequat"],
    "source": "public api",
    "country": "US",
    "companyName": "DGS VolMAX",
    "assignedTo": kitkat_id
}
headers = {
    "Authorization": f"Bearer {Nestle_contacts_convo_token}",
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.json())