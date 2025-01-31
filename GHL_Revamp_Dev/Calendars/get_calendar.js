const axios = require('axios');
const config = require("../env/config");
const constant = require("../env/constant");

const NestleAccessToken = 'pit-98e16ccd-8c1e-4e6f-a96d-57ef6cb2cf62';
const calendar_id = 'nNKMeKxstubPEDQHnOW7';


const headers = {
    "Authorization": `Bearer ${NestleAccessToken}`,
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
};

axios.get(config.calendars_url+calendar_id,{ headers })
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
