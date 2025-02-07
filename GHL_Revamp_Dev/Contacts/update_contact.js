const axios = require('axios');
const config = require('../environment/config');
const constant = require('../environment/constant');



const firstName = "Mohnishkumar";
const lastName = "Rajkumar";
const name = "Mohnishkumar Rajkumar";
const email = "mohnish123@email.com"
const phone = "+44222344578";
const address1 = "3535 1st St N";
const city = "Chicago";
const state = "US";
const postalCode = "35061";
const website = "https://www.tesla.com";
const timezone = "America/Chihuahua";
const DND = true;
const country = "US";
const companyName = "DGS VolMAX";


const payload = {
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
        } },
    "tags": ["nisi sint commodo amet", "consequat"],
    "source": "public api",
    "country": country,
    "companyName": companyName,
    "assignedTo": constant.kitkat_id
};

const headers = {
    "Authorization": `Bearer ${config.Nestle_contacts_convo_token}`,
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
};


axios.put(config.contacts_url+constant.contact_id_new, payload, { headers })
    .then(response => {
        console.log(response.data);
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