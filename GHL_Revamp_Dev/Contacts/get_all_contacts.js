const axios = require('axios');
const config = require("../environment/config");
const constant = require("../environment/constant");

const Nestle_contacts_convo_token = 'pit-1fc00b1f-35e7-4a86-90c0-ccdeefd935b0';
const location_id = "lBPqgBowX1CsjHay12LY";


const headers = {
    "Authorization": `Bearer ${Nestle_contacts_convo_token}`,
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
};

const params = {
    "locationId":location_id,
}

axios.get(config.contacts_url,{ headers, params })
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
