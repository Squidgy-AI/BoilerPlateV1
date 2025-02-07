const axios = require('axios');
const constant = require('../environment/config');
const config = require('../environment/config');


const startTime = "2024-11-27T05:30:00+05:30";
const endTime = "2024-11-27T06:30:00+05:30"
const title = `Event with ${constant.contact_id}`;
const address = "Zoom";
const IGNORE_DATE_RANGE = false;
const TO_NOTIFY = false;
const appointmentStatus = "new";
const IGNORE_FREE_SLOT_VALIDATION = true;

const event_id = "123";

const update_payload = {
    "calendarId": constant.calendar_id1,
    "startTime": startTime,
    "endTime": endTime,
    "title": title,
    "meetingLocationType": "default",
    "appointmentStatus": appointmentStatus,
    "assignedUserId": constant.kitkat_id,
    "address": address,
    "ignoreDateRange": IGNORE_DATE_RANGE,
    "toNotify": TO_NOTIFY,
    "ignoreFreeSlotValidation": IGNORE_FREE_SLOT_VALIDATION,
    "rrule": "RRULE:FREQ=DAILY;INTERVAL=1;COUNT=5"
  }

  const headers = {
    "Authorization": `Bearer ${config.Nestle_access_token}`,
    "Version": "2021-04-15",
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

axios.put(config.appointment_url+event_id,{ headers }) 
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