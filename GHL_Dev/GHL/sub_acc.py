import requests

Company_Id = 'lp2p1q27DrdGta1qGDJd'
Agency_Api_Key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb21wYW55X2lkIjoibHAycDFxMjdEcmRHdGExcUdESmQiLCJ2ZXJzaW9uIjoxLCJpYXQiOjE3MzE3NzMzOTIzNTgsInN1YiI6Ik11VklrS3NEVm12YnRTUlliTzRiIn0.2PIUrvtQYpmKxQXoss1IV9vdIU1VnmbDHcpFw2dodLo'
Relationship_Id = '0-099-130'
Agency_Access_Key = 'pit-ad700aa3-8481-4cff-b555-bcaac7532592'

url = "https://services.leadconnectorhq.com/locations/"

payload = {
    "name": "Nestle LLC - MOKSH TEST",
    "phone": "+1410039940",
    "companyId": Company_Id,
    "address": "4th fleet street",
    "city": "New York",
    "state": "Illinois",
    "country": "US",
    "postalCode": "567654",
    "website": "https://yourwebsite.com",
    "timezone": "US/Central",
    "prospectInfo": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@mail.com"
    },
    "settings": {
        "allowDuplicateContact": False,
        "allowDuplicateOpportunity": False,
        "allowFacebookNameMerge": False,
        "disableContactTimezone": False
    },
    "social": {
        "facebookUrl": "https://www.facebook.com/",
        "googlePlus": "https://www.googleplus.com/",
        "linkedIn": "https://www.linkedIn.com/",
        "foursquare": "https://www.foursquare.com/",
        "twitter": "https://www.foutwitterrsquare.com/",
        "yelp": "https://www.yelp.com/",
        "instagram": "https://www.instagram.com/",
        "youtube": "https://www.youtube.com/",
        "pinterest": "https://www.pinterest.com/",
        "blogRss": "https://www.blogRss.com/",
        "googlePlacesId": "ChIJJGPdVbQTrjsRGUkefteUeFk"
    }
}
headers = {
    "Authorization": f"Bearer {Agency_Access_Key}",
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.json())

'''
{'id': 'lBPqgBowX1CsjHay12LY', 'companyId': 'lp2p1q27DrdGta1qGDJd', 'name': 'Nestle LLC - SOMA TEST', 'address': '4th fleet street', 'city': 'New York', 'state': 'Illinois', 'country': 'US', 'postalCode': '567654', 'website': 'https://yourwebsite.com', 'timezone': 'US/Central', 'firstName': 'John', 'lastName': 'Doe', 'email': 'john.doe@mail.com', 'phone': '+1410039940', 'business': {'name': 'Nestle LLC - SOMA TEST', 'address': '4th fleet street', 'city': 'New York', 'state': 'Illinois', 'country': 'US', 'postalCode': '567654', 'website': 'https://yourwebsite.com', 'timezone': 'US/Central'}, 'social': {'facebookUrl': 'https://www.facebook.com/', 'googlePlus': 'https://www.googleplus.com/', 'linkedIn': 'https://www.linkedIn.com/', 'foursquare': 'https://www.foursquare.com/', 'twitter': 'https://www.foutwitterrsquare.com/', 'yelp': 'https://www.yelp.com/', 'instagram': 'https://www.instagram.com/', 'youtube': 'https://www.youtube.com/', 'pinterest': 'https://www.pinterest.com/', 'blogRss': 'https://www.blogRss.com/', 'googlePlacesId': 'ChIJJGPdVbQTrjsRGUkefteUeFk'}, 'settings': {'allowDuplicateContact': False, 'allowDuplicateOpportunity': False, 'allowFacebookNameMerge': False, 'disableContactTimezone': False, 'contactUniqueIdentifiers': ['email', 'phone']}, 'dateAdded': '2024-11-17T01:02:55.684Z', 'domain': '', 'traceId': 'd307468a-b20f-456e-8bd4-d611e7d883d3'}
'''