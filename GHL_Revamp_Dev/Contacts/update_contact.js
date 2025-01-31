const axios = require('axios');
const config = require('../env/config');
const constant = require('../env/constant');


const cCompany_Id = 'lp2p1q27DrdGta1qGDJd'
const Agency_Api_Key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb21wYW55X2lkIjoibHAycDFxMjdEcmRHdGExcUdESmQiLCJ2ZXJzaW9uIjoxLCJpYXQiOjE3MzE3NzMzOTIzNTgsInN1YiI6Ik11VklrS3NEVm12YnRTUlliTzRiIn0.2PIUrvtQYpmKxQXoss1IV9vdIU1VnmbDHcpFw2dodLo'
const Relationship_Id = '0-099-130'
const Agency_Access_Key = 'pit-ad700aa3-8481-4cff-b555-bcaac7532592'
const nescafe_id = '6ZHPyo1FRlZNBGzH5szG'
const maggie_id = 'Fj1JPxueiId1Ki15fZZA'
const kitkat_id = 'kmfwpeEjk5QjgGVdD4Su'
const Nestle_Api_Key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6ImxCUHFnQm93WDFDc2pIYXkxMkxZIiwidmVyc2lvbiI6MSwiaWF0IjoxNzMxOTkyNDg3MDU0LCJzdWIiOiJhWjBuNGV0ck5DRUIyOXNvbmE4TSJ9.czCh27fEwqxW4KzDx0gVbYcpdtcChy_31h9SoQuptAA'
const Nestle_access_token = 'pit-98e16ccd-8c1e-4e6f-a96d-57ef6cb2cf62'
const Nestle_contacts_convo_token = 'pit-1fc00b1f-35e7-4a86-90c0-ccdeefd935b0'

const calendar_id1 = 'nNKMeKxstubPEDQHnOW7'

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
    "assignedTo": kitkat_id
};

const headers = {
    "Authorization": `Bearer ${Nestle_contacts_convo_token}`,
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
};

const contact_id = "UPCcdhjzBUVPcivkJ2vx";

axios.put(config.contacts_url+contact_id, payload, { headers })
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