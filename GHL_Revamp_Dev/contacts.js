const axios = require('axios');
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
const sub_account_id = 'lBPqgBowX1CsjHay12LY'

const calendar_id1 = 'nNKMeKxstubPEDQHnOW7'

const url = "https://services.leadconnectorhq.com/contacts/"

const firstName = "Mohnishkumar";
const lastName = "Rajkumar";
const name = "Mohnishkumar Rajkumar";
const email = "mohnish123@email.com"
const gender = "male";
const phone = "+1 888-888-9999";
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
    firstName: firstName,
    lastName: lastName,
    name: name,
    email: email,
    locationId: sub_account_id,
    gender: gender,
    phone: phone,
    address1: address1,
    city: city,
    state: state,
    postalCode: postalCode,
    website: website,
    timezone: timezone,
    dnd: DND,
    dndSettings: {
        Call: {
            status: "active",
            message: "string",
            code: "string"
        },
        Email: {
            status: "active",
            message: "string",
            code: "string"
        },
        SMS: {
            status: "active",
            message: "string",
            code: "string"
        },
        WhatsApp: {
            status: "active",
            message: "string",
            code: "string"
        },
        GMB: {
            status: "active",
            message: "string",
            code: "string"
        },
        FB: {
            status: "active",
            message: "string",
            code: "string"
        }
    },
    inboundDndSettings: { all: {
            status: "active",
            message: "string"
        } },
    tags: ["nisi sint commodo amet", "consequat"],
    source: "public api",
    country: country,
    companyName: companyName,
    assignedTo: kitkat_id
};

const headers = {
    Authorization: `Bearer ${Nestle_contacts_convo_token}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
    Accept: "application/json"
};

axios.post(url, payload, { headers })
    .then(response => {
        console.log(response.data);
    })
    .catch(error => {
        console.error('Error:', error.response ? error.response.data : error.message);
    });