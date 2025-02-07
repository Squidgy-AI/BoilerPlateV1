const axios = require('axios');
const config = require("../environment/config");
const constant = require("../environment/constant");



const headers = {
    "Authorization": `Bearer ${constant.Agency_Access_Key}`,
    "Version": "2021-07-28",
    "Content-Type": "application/json",
    "Accept": "application/json"
};


axios.delete(config.users_url+constant.user_id,{ headers })
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
