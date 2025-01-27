const axios = require('axios');

const Company_Id = 'lp2p1q27DrdGta1qGDJd';
const Agency_Api_Key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb21wYW55X2lkIjoibHAycDFxMjdEcmRHdGExcUdESmQiLCJ2ZXJzaW9uIjoxLCJpYXQiOjE3MzE3NzMzOTIzNTgsInN1YiI6Ik11VklrS3NEVm12YnRTUlliTzRiIn0.2PIUrvtQYpmKxQXoss1IV9vdIU1VnmbDHcpFw2dodLo';
const Relationship_Id = '0-099-130';
const Agency_Access_Key = 'pit-ad700aa3-8481-4cff-b555-bcaac7532592';
const nescafe_id = '6ZHPyo1FRlZNBGzH5szG';
const maggie_id = 'Fj1JPxueiId1Ki15fZZA';
const kitkat_id = 'kmfwpeEjk5QjgGVdD4Su';
const Nestle_Api_Key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6ImxCUHFnQm93WDFDc2pIYXkxMkxZIiwidmVyc2lvbiI6MSwiaWF0IjoxNzMxOTkyNDg3MDU0LCJzdWIiOiJhWjBuNGV0ck5DRUIyOXNvbmE4TSJ9.czCh27fEwqxW4KzDx0gVbYcpdtcChy_31h9SoQuptAA';
const Nestle_access_token = 'pit-98e16ccd-8c1e-4e6f-a96d-57ef6cb2cf62';
const sub_account_id = 'lBPqgBowX1CsjHay12LY';
const calendar_id1 = 'nNKMeKxstubPEDQHnOW7';
const contact_id = 'kpYoxc5GbJSAYVRrzRra';

const startTime = "2024-11-27T05:30:00+05:30";
const endTime = "2024-11-27T06:30:00+05:30"
const title = `Event with ${contact_id}`;
const address = "Zoom";
const IGNORE_DATE_RANGE = false;
const TO_NOTIFY = false;
const appointmentStatus = "new";

const url = "https://services.leadconnectorhq.com/calendars/events/appointments";

const payload = {
  calendarId: calendar_id1,
  locationId: sub_account_id,
  contactId: contact_id,
  startTime: startTime,
  endTime: endTime,
  title: title,
  meetingLocationType: "default",
  appointmentStatus: appointmentStatus,
  assignedUserId: kitkat_id,
  address: address,
  ignoreDateRange: IGNORE_DATE_RANGE,
  toNotify: TO_NOTIFY
};

const headers = {
  Authorization: `Bearer ${Nestle_access_token}`,
  Version: "2021-04-15",
  "Content-Type": "application/json",
  Accept: "application/json"
};

axios.post(url, payload, { headers })
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error(error.response ? error.response.data : error.message);
  });