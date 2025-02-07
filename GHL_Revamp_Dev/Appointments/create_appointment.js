const axios = require('axios');
const config = require('../environment/config');
const constant = require('../environment/constant');

const startTime = "2024-11-27T05:30:00+05:30";
const endTime = "2024-11-27T06:30:00+05:30"
const title = `Event with ${constant.contact_id}`;
const address = "Zoom";
const IGNORE_DATE_RANGE = false;
const TO_NOTIFY = false;
const appointmentStatus = "new";


const payload = {
  "calendarId": constant.calendar_id1,
  "locationId": constant.location_id,
  "contactId": constant.contact_id,
  "startTime": startTime,
  "endTime": endTime,
  "title": title,
  "meetingLocationType": "default",
  "appointmentStatus": appointmentStatus,
  "assignedUserId": constant.kitkat_id,
  "address": address,
  "ignoreDateRange": IGNORE_DATE_RANGE,
  "toNotify": TO_NOTIFY
};

const headers = {
  "Authorization": `Bearer ${config.Nestle_access_token}`,
  "Version": "2021-04-15",
  "Content-Type": "application/json",
  "Accept": "application/json"
};

axios.post(config.appointment_url, payload, { headers })
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