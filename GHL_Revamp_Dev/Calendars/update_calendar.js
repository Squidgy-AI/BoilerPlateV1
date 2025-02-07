const axios = require('axios');
const constant = require('../environment/config');
const config = require('../environment/config');


const eventType = "RoundRobin_OptimizeForAvailability";
const eventName = `calendar for ${constant.kitkat_id} and ${constant.nescafe_id}`;
const description = "this is used for testing";
const slug = "test1";
const widgetSlug = "test1";
const calendarType = "round_robin";
const widgetType = "classic";
const eventTitle = `${constant.nescafe_id} Calling in ${constant.kitkat_id}`;
const eventColor = "#039be5";
const slotDuration = 30;
const slotBuffer = 0;
const slotInterval = 30;
const preBuffer = 0;
const appoinmentPerSlot = 1;
const appoinmentPerDay = 0;
const allowBookingAfter = 0;
const daysOfTheWeek = [2];


const payload = {
    "locationId": constant.location_id,
    "teamMembers": [
        {
            "userId": constant.nescafe_id,
            "priority": 0.5,
            "meetingLocationType": "custom",
            "meetingLocation": "string",
            "isPrimary": true
        },
        {
            "userId": constant.kitkat_id,
            "priority": 1,
            "meetingLocationType": "custom",
            "meetingLocation": "string",
            "isPrimary": true
        }
    ],
    "eventType": eventType,
    "name": eventName,
    "description": description,
    "slug": slug,
    "widgetSlug": widgetSlug,
    "calendarType": calendarType,
    "widgetType": widgetType,
    "eventTitle": eventTitle,
    "eventColor": eventColor,
    "meetingLocation": "string",
    "slotDuration": slotDuration,
    "slotDurationUnit": "mins",
    "slotInterval": slotInterval,
    "slotIntervalUnit": "mins",
    "slotBuffer": slotBuffer,
    "slotBufferUnit": "mins",
    "preBuffer": preBuffer,
    "preBufferUnit": "mins",
    "appoinmentPerSlot": appoinmentPerSlot,
    "appoinmentPerDay": appoinmentPerDay,
    "allowBookingAfter": allowBookingAfter,
    "allowBookingAfterUnit": "hours",
    "allowBookingFor": 0,
    "allowBookingForUnit": "days",
    "openHours": [
        {
            "daysOfTheWeek": daysOfTheWeek,
            "hours": [
                {
                    "openHour": 0,
                    "openMinute": 0,
                    "closeHour": 0,
                    "closeMinute": 0
                }
            ]
        }
    ],
    "enableRecurring": false,
    "recurring": {
        "freq": "DAILY",
        "count": 24,
        "bookingOption": "skip",
        "bookingOverlapDefaultStatus": "confirmed"
    },
    "formId": "string",
    "stickyContact": true,
    "isLivePaymentMode": true,
    "autoConfirm": true,
    "shouldSendAlertEmailsToAssignedMember": true,
    "alertEmail": "string",
    "googleInvitationEmails": false,
    "allowReschedule": true,
    "allowCancellation": true,
    "shouldAssignContactToTeamMember": true,
    "shouldSkipAssigningContactForExisting": true,
    "notes": "string",
    "pixelId": "string",
    "formSubmitType": "ThankYouMessage",
    "formSubmitRedirectURL": "string",
    "formSubmitThanksMessage": "string",
    "availabilityType": 0,
    "availabilities": [
        {
            "date": "2024-11-23T00:00:00.000Z",
            "hours": [
                {
                    "openHour": 11,
                    "openMinute": 30,
                    "closeHour": 12,
                    "closeMinute": 30
                }
            ],
            "deleted": false
        }
    ],
    "guestType": "count_only",
    "consentLabel": "string",
    "lookBusyConfig": {
        "enabled": true,
        "LookBusyPercentage": 0
    }
};

const headers = {
    "Authorization": `Bearer ${config.NestleAccessToken}`,
    "Version": "2021-04-15",
    "Content-Type": "application/json",
    "Accept": "application/json"
};


axios.put(config.calendars_url+constant.calendar_id1, payload, { headers })
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
