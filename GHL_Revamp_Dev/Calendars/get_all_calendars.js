const axios = require('axios');
const config = require("../environment/config");
const constant = require("../environment/constant");

const NestleAccessToken = 'pit-98e16ccd-8c1e-4e6f-a96d-57ef6cb2cf62';


const headers = {
    "Authorization": `Bearer ${NestleAccessToken}`,
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
};

axios.get(config.calendars_url,{ headers })
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
