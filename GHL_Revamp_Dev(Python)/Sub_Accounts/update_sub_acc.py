import requests
import json
from environment import config, constant

clientName = 'Nestle LLC - MKR TEST'
phoneNumber = '+1410039940'
address = "4th fleet street"
city = "New York"
state = "Illinois"
country = "US"
postalCode = "567654"
websiteLink = "https://yourwebsite.com"
timeZone = "US/Central"

# Prospect Info
firstName = "John"
lastName = "Doe"
email = "john.doe@mail.com"

# Settings
ALLOW_DUPLICATE_CONTACT = False
ALLOW_DUPLICATE_OPPORTUNITY = False
ALLOW_FACEBOOK_NAME_MERGE = False
DISABLE_CONTACT_TIMEZONE = False

# Social URLs
FACEBOOK_URL = "https://www.facebook.com/"
GOOGLE_PLUS_URL = "https://www.googleplus.com/"
LINKEDIN_URL = "https://www.linkedIn.com/"
FOURSQUARE_URL = "https://www.foursquare.com/"
TWITTER_URL = "https://www.foutwitterrsquare.com/"
YELP_URL = "https://www.yelp.com/"
INSTAGRAM_URL = "https://www.instagram.com/"
YOUTUBE_URL = "https://www.youtube.com/"
PINTEREST_URL = "https://www.pinterest.com/"
BLOG_RSS_URL = "https://www.blogRss.com/"
GOOGLE_PLACES_ID = "ChIJJGPdVbQTrjsRGUkefteUeFk"

update_payload = {
    "name": clientName,
    "phone": phoneNumber,
    "companyId": constant.constant.Company_Id,
    "address": address,
    "city": city,
    "state": state,
    "country": country,
    "postalCode": postalCode,
    "website": websiteLink,
    "timezone": timeZone,
    "prospectInfo": {
        "firstName": firstName,
        "lastName": lastName,
        "email": email
    },
    "settings": {
        "allowDuplicateContact": ALLOW_DUPLICATE_CONTACT,
        "allowDuplicateOpportunity": ALLOW_DUPLICATE_OPPORTUNITY,
        "allowFacebookNameMerge": ALLOW_FACEBOOK_NAME_MERGE,
        "disableContactTimezone": DISABLE_CONTACT_TIMEZONE
    },
    "social": {
        "facebookUrl": FACEBOOK_URL,
        "googlePlus": GOOGLE_PLUS_URL,
        "linkedIn": LINKEDIN_URL,
        "foursquare": FOURSQUARE_URL,
        "twitter": TWITTER_URL,
        "yelp": YELP_URL,
        "instagram": INSTAGRAM_URL,
        "youtube": YOUTUBE_URL,
        "pinterest": PINTEREST_URL,
        "blogRss": BLOG_RSS_URL,
        "googlePlacesId": GOOGLE_PLACES_ID
    }
}

headers = {
    "Authorization": f"Bearer {constant.constant.Agency_Access_Key}",
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

response = requests.put(f"{config.config.sub_acc_url}{constant.constant.location_id}", headers=headers, data=json.dumps(update_payload))

if response.status_code == 200:
    print(response.json())
else:
    print(f"Error: {response.status_code}")
    print(response.json())