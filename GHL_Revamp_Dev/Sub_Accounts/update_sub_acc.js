const axios = require('axios');
const config = require("../environment/config");
const constant = require("../environment/constant");



const clientName = 'Nestle LLC - MKR TEST';
const phoneNumber = '+1410039940';
const address = "4th fleet street";
const city = "New York";
const state = "Illinois";
const country = "US";
const postalCode = "567654";
const websiteLink = "https://yourwebsite.com";
const timeZone = "US/Central";

// Prospect Info
const firstName = "John";
const lastName = "Doe";
const email = "john.doe@mail.com"

// Settings
const ALLOW_DUPLICATE_CONTACT = false;
const ALLOW_DUPLICATE_OPPORTUNITY = false;
const ALLOW_FACEBOOK_NAME_MERGE = false;
const DISABLE_CONTACT_TIMEZONE = false;

// Social URLs
const FACEBOOK_URL = "https://www.facebook.com/";
const GOOGLE_PLUS_URL = "https://www.googleplus.com/";
const LINKEDIN_URL = "https://www.linkedIn.com/";
const FOURSQUARE_URL = "https://www.foursquare.com/";
const TWITTER_URL = "https://www.foutwitterrsquare.com/";
const YELP_URL = "https://www.yelp.com/";
const INSTAGRAM_URL = "https://www.instagram.com/";
const YOUTUBE_URL = "https://www.youtube.com/";
const PINTEREST_URL = "https://www.pinterest.com/";
const BLOG_RSS_URL = "https://www.blogRss.com/";
const GOOGLE_PLACES_ID = "ChIJJGPdVbQTrjsRGUkefteUeFk";


const update_payload = {
    "name": clientName,
    "phone": phoneNumber,
    "companyId": Company_Id,
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
};

const headers = {
    "Authorization": `Bearer ${constant.Agency_Access_Key}`,
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
};

axios.put(config.sub_acc_url + constant.location_id,update_payload,{ headers })
.then(response => {
    console.log(response.data)
})
.catch(error => {
    if (error.response) {
        console.error('Error Response:', {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
        });
    } else if (error.request) {
        console.error('No Response Received:', error.request);
    } else {
        console.error('Request Error:', error.message);
    }
});