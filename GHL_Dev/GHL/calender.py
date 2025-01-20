Company_Id = 'lp2p1q27DrdGta1qGDJd'
Agency_Api_Key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb21wYW55X2lkIjoibHAycDFxMjdEcmRHdGExcUdESmQiLCJ2ZXJzaW9uIjoxLCJpYXQiOjE3MzE3NzMzOTIzNTgsInN1YiI6Ik11VklrS3NEVm12YnRTUlliTzRiIn0.2PIUrvtQYpmKxQXoss1IV9vdIU1VnmbDHcpFw2dodLo'
Relationship_Id = '0-099-130'
Agency_Access_Key = 'pit-ad700aa3-8481-4cff-b555-bcaac7532592'
nescafe_id = '6ZHPyo1FRlZNBGzH5szG'
maggie_id = 'Fj1JPxueiId1Ki15fZZA'
kitkat_id = 'kmfwpeEjk5QjgGVdD4Su'
Nestle_Api_Key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6ImxCUHFnQm93WDFDc2pIYXkxMkxZIiwidmVyc2lvbiI6MSwiaWF0IjoxNzMxOTkyNDg3MDU0LCJzdWIiOiJhWjBuNGV0ck5DRUIyOXNvbmE4TSJ9.czCh27fEwqxW4KzDx0gVbYcpdtcChy_31h9SoQuptAA'
Nestle_access_token = 'pit-98e16ccd-8c1e-4e6f-a96d-57ef6cb2cf62'
sub_account_id = 'lBPqgBowX1CsjHay12LY'

from abc import cancellation_param
calendar_id1 = 'nNKMeKxstubPEDQHnOW7'

import requests

url = "https://services.leadconnectorhq.com/calendars/"

payload = {
    "locationId": sub_account_id,
    "teamMembers": [
        {
            "userId": nescafe_id,
            "priority": 0.5,
            "meetingLocationType": "custom",
            "meetingLocation": "string",
            "isPrimary": True
        },
        {
            "userId": kitkat_id,
            "priority": 1,
            "meetingLocationType": "custom",
            "meetingLocation": "string",
            "isPrimary": True
        }
    ],
    "eventType": "RoundRobin_OptimizeForAvailability",
    "name": f"calendar for {kitkat_id} and {nescafe_id}",
    "description": "this is used for testing",
    "slug": "test1",
    "widgetSlug": "test1",
    "calendarType": "round_robin",
    "widgetType": "classic",
    "eventTitle": f"{nescafe_id} Calling in {kitkat_id}",
    "eventColor": "#039be5",
    "meetingLocation": "string",
    "slotDuration": 30,
    "slotDurationUnit": "mins",
    "slotInterval": 30,
    "slotIntervalUnit": "mins",
    "slotBuffer": 0,
    "slotBufferUnit": "mins",
    "preBuffer": 0,
    "preBufferUnit": "mins",
    "appoinmentPerSlot": 1,
    "appoinmentPerDay": 0,
    "allowBookingAfter": 0,
    "allowBookingAfterUnit": "hours",
    "allowBookingFor": 0,
    "allowBookingForUnit": "days",
    "openHours": [
        {
            "daysOfTheWeek": [2],
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
    "enableRecurring": False,
    "recurring": {
        "freq": "DAILY",
        "count": 24,
        "bookingOption": "skip",
        "bookingOverlapDefaultStatus": "confirmed"
    },
    "formId": "string",
    "stickyContact": True,
    "isLivePaymentMode": True,
    "autoConfirm": True,
    "shouldSendAlertEmailsToAssignedMember": True,
    "alertEmail": "string",
    "googleInvitationEmails": False,
    "allowReschedule": True,
    "allowCancellation": cancellation_param,
    "shouldAssignContactToTeamMember": True,
    "shouldSkipAssigningContactForExisting": True,
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
            "deleted": False
        }
    ],
    "guestType": "count_only",
    "consentLabel": "string",
    "lookBusyConfig": {
        "enabled": True,
        "LookBusyPercentage": 0
    }
}
headers = {
    "Authorization": f"Bearer {Nestle_access_token}",
    "Version": "2021-04-15",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.json())

"""
url = f"https://services.leadconnectorhq.com/companies/{Company_Id}"

headers = {
    "Authorization": f"Bearer {Agency_Access_Key}",
    "Version": "2021-07-28",
    "Accept": "application/json"
}

response = requests.get(url, headers=headers)

print(response.json())

'''
{'company': {'id': 'lp2p1q27DrdGta1qGDJd', 'name': 'OnetooDotCom OU', 'email': 'info@onetoo.com', 'logoUrl': 'https://msgsndr-private.storage.googleapis.com/companyPhotos/a260fcce-b5d6-4664-bc7a-26b753f48588.png', 'phone': '+17862474637', 'website': 'onetoo.com', 'domain': 'app.onetoo.com', 'spareDomain': 'link.onetoo.com', 'privacyPolicy': 'https://onetoo.com/privacy', 'termsConditions': 'https://onetoo.com/terms', 'address': '20 Wenlock Road', 'city': 'Islington', 'postalCode': 'N1 7GU', 'country': 'GB', 'state': 'London', 'timezone': 'Europe/London', 'relationshipNumber': '0-099-130', 'subdomain': 'onetoodotcomou', 'plan': 0, 'currency': 'USD', 'customerType': 'agency', 'termsOfServiceVersion': '19/08/2024', 'termsOfServiceAcceptedBy': 'MuVIkKsDVmvbtSRYbO4b', 'termsOfServiceAcceptedDate': '2024-08-27T14:44:13.408Z', 'privacyPolicyVersion': '19/08/2024', 'privacyPolicyAcceptedBy': 'MuVIkKsDVmvbtSRYbO4b', 'privacyPolicyAcceptedDate': '2024-08-27T14:44:13.408Z', 'affiliatePolicyVersion': '03/02/2021', 'affiliatePolicyAcceptedBy': 'MuVIkKsDVmvbtSRYbO4b', 'affiliatePolicyAcceptedDate': '2023-03-29T23:30:24.096Z', 'isReselling': True, 'onboardingInfo': {'haveWebsite': True, 
'websiteUrl': 'onetoo.com', 'pending': False, 'metaData': {'captureCsr': 'Kasey Peterson', 'implementationCsr_1': 'Benjamin Painton', 'firstImplementationCallDate': '2023-09-14T00:00:00.000Z'}, 'location': False, 'tools': ['calendly', 'clickfunnels', 'activecampaign', 'wordpress', 'kajabi', 'typeform', 'wix', 'hubspot'], 'industryServed': 'Consulting / Agency', 'customerCount': '4-9'}, 'upgradeEnabledForClients': True, 'stripeConnectId': 'acct_1O0ud8J8RcikPHVy', 'inIsvMode': True, 'twilioFreeCredits': True, 'twilioTrialMode': True, 'experienceNpsEnabled': True, 'experienceGuidesEnabled': True, 'experienceReportsEnabled': True, 'betaFeaturesEnabled': True, 'dateAdded': '2023-03-29T23:27:50.828Z', 'hasLcEmail': True, 'elizaEnabled': False, 'showMobileAppToClients': True, 'premiumUpgraded': False, 'defaultSendingDomain': 'talk.onetoo.com', 'emailDomain': {'talk.onetoo.com': {'domainAddedDate': '2023-04-05T12:25:23.450Z', 'dateAdded': '2023-10-10T20:35:03.851Z', 'unverifiedDomainDeletionDate': '2023-04-20T12:25:23.441Z', 'active': True, 'ssl': 'ISSUED'}}, 'status': 'active', 'locationCount': 62, 'autoSuspendEnabled': True, 'cancelEnabledForClients': False, 'saasSettings': {'upgradeLocationPermissions': True, 'stripeConnectInitiatedBy': 'MuVIkKsDVmvbtSRYbO4b', 'welcomeEmailTemplateId': '', 'agencyDashboardVisibleTo': 'admin', 'pauseOnCreation': True, 'enablePhoneVerification': True, 'customEmailTemplateLocationId': ''}, 'referralId': 'onetoodotcom-ou37', 'businessNiche': 'Marketing Agency', 'agencyPrimaryUse': 'To help my clients or other businesses with marketing', 'businessCategory': 'Marketing Agency', 'yextUserId': 'yext_user-lp2p1q27DrdGta1qGDJd', 'yextUserEmail': 'info+yext@onetoo.com', 'paUsage': ['saas'], 'affiliatePixelId': '1174037323283748', 'upgradeAlertDismissed': '2024-11-11T10:25:49.701Z', 'yextAgencyPrice': 49, 'wordPressAgencyPrice': 14.99, 'wordPressSaasOffer': {'plan': 'STANDARD_PLUS'}, 'enhancedSecurityOptions': False}, 'traceId': 'c596644a-e338-4663-b10e-70c770c1dd8d'}
'''
"""