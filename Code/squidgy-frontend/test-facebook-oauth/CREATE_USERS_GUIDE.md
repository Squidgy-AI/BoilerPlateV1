# 🚀 GoHighLevel User Creation Guide

## Overview
This script creates two users in GoHighLevel:

1. **Jeremy Chen** - Admin role (jeremy.chend@gmail.com)
2. **Ovi Colton** - User role (ovi.chand@gmail.com)

Both users will have:
- Password: `Dummy@123`
- All permissions enabled
- Access to your specified location

## 📋 Prerequisites

### 1. Get Your Bearer Token
You need a valid Private Integration token from GoHighLevel.

**How to get it:**
1. Login to GoHighLevel
2. Go to **Settings** → **Private Integrations**
3. Click **"Create Private Integration"**
4. Fill out the form:
   - **Name**: "User Management API"
   - **Scopes**: Select all scopes (especially `users.write`)
5. Click **Create**
6. Copy the generated token (starts with `pit-`)

### 2. Update the Script
Open `quick_create_users.py` and replace the bearer token:

```python
# Line 11 - Replace this:
BEARER_TOKEN = "YOUR_BEARER_TOKEN_HERE"

# With your actual token:
BEARER_TOKEN = "pit-your-actual-token-here"
```

## 🏃‍♂️ Running the Script

```bash
python quick_create_users.py
```

## 📤 Expected Output

### Success Case:
```
Creating Jeremy Chen (Admin)...
Jeremy Response Status: 201
✅ Jeremy Chen created! User ID: abc123xyz
{
  "id": "abc123xyz",
  "firstName": "Jeremy",
  "lastName": "Chen",
  "email": "jeremy.chend@gmail.com",
  "role": "admin",
  ...
}

==================================================

Creating Ovi Colton (User)...
Ovi Response Status: 201
✅ Ovi Colton created! User ID: def456uvw
{
  "id": "def456uvw",
  "firstName": "Ovi",
  "lastName": "Colton",
  "email": "ovi.chand@gmail.com",
  "role": "user",
  ...
}
```

### Common Errors:

1. **401 Unauthorized**
   ```
   ❌ Failed: {"statusCode":401,"message":"Invalid Private Integration token"}
   ```
   **Fix**: Update the bearer token with a valid one

2. **400 Bad Request**
   ```
   ❌ Failed: {"statusCode":400,"message":"Email already exists"}
   ```
   **Fix**: The email is already in use. Change the email addresses in the script.

3. **403 Forbidden**
   ```
   ❌ Failed: {"statusCode":403,"message":"Insufficient permissions"}
   ```
   **Fix**: Your Private Integration needs `users.write` scope

## 🔍 Getting User IDs

After successful creation, you'll see the user IDs in the output:
- **Jeremy Chen's User ID**: Look for `"id": "xxxxx"` in Jeremy's response
- **Ovi Colton's User ID**: Look for `"id": "xxxxx"` in Ovi's response

## 📝 What's Created

### User Details:

**Jeremy Chen (Admin)**
- Email: jeremy.chend@gmail.com
- Password: Dummy@123
- Role: admin
- Type: account
- Phone: +18332327657

**Ovi Colton (User)**
- Email: ovi.chand@gmail.com
- Password: Dummy@123
- Role: user
- Type: account
- Phone: +17166044029

### Permissions (Both Users):
All permissions are enabled including:
- Campaigns
- Contacts
- Workflows
- Funnels
- Websites
- Opportunities
- Dashboard Stats
- Appointments
- Reviews
- Phone Calls
- Conversations
- Social Planner
- Invoices
- Payments
- And many more...

## 🛠️ Customization

To modify user details, edit these sections in `quick_create_users.py`:

```python
# For Jeremy Chen (around line 71)
jeremy_payload = {
    "firstName": "Jeremy",
    "lastName": "Chen",
    "email": "jeremy.chend@gmail.com",
    "password": "Dummy@123",
    "role": "admin",  # Change to "user" for regular user
    ...
}

# For Ovi Colton (around line 97)
ovi_payload = {
    "firstName": "Ovi",
    "lastName": "Colton",
    "email": "ovi.chand@gmail.com",
    "password": "Dummy@123",
    "role": "user",  # Change to "admin" for admin role
    ...
}
```

## 🔒 Security Notes

1. **Never commit bearer tokens** to version control
2. **Change passwords** after initial setup
3. **Review permissions** based on actual needs
4. **Store tokens securely** (use environment variables in production)

## 📞 Need Help?

If you encounter issues:
1. Verify your bearer token is valid
2. Check that your Private Integration has the correct scopes
3. Ensure the email addresses aren't already in use
4. Verify the company ID and location ID are correct