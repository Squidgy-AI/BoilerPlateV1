const axios = require('axios');
const config = require("../environment/config");
const constant = require("../environment/constant");



const headers = {
    "Authorization": `Bearer ${config.Nestle_contacts_convo_token}`,
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
};

const params = {
    "locationId":constant.location_id,
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
