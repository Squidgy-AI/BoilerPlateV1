const axios = require('axios');
const config = require("../environment/config");
const constant = require("../environment/constant");

const Agency_Access_Key = 'pit-ad700aa3-8481-4cff-b555-bcaac7532592';

const event_id = "123";



const headers = {
    "Authorization": `Bearer ${Agency_Access_Key}`,
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
};

axios.get(config.appointment_url+event_id,{ headers })
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