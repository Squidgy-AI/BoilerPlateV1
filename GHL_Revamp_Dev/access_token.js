const axios = require('axios');
const config = require('./environment/config')


const client_id = "673feeff6d29e38a913dc2b7-m3s5b8mt";
const client_secret = "56468d3d-6927-48ab-8adc-0d8f22b4da90";
const code_value = "7187472f087eec96654a9ae8cee06d017ad972b8"

const payload = {
    "client_id": client_id,
    "client_secret": client_secret,
    "grant_type": "authorization_code",
    "code": code_value
};

const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "application/json"
};

axios.post(config.auth_token_url, payload, { headers })

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
