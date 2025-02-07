const axios = require('axios');
const config = require("../environment/config");
const constant = require("../environment/constant");



const headers = {
    "Authorization": `Bearer ${config.Nestle_contacts_convo_token}`,
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
};

axios.delete(config.contacts_url+constant.contact_id_new,{ headers })
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
