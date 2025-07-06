# GHL Facebook Integration API Endpoints

## Overview
These are the three main endpoints for Facebook integration in GoHighLevel's backend API. All endpoints require proper authentication via JWT token.

## Authentication
All requests require these headers:
```
token-id: [JWT_TOKEN]
channel: APP
source: WEB_USER
version: 2021-07-28
accept: application/json, text/plain, */*
```

## Endpoints

### 1. Check Facebook Connection Status
**Purpose**: Verify if Facebook is connected to the GHL location/sub-account

```
GET /integrations/facebook/{locationId}/connection
```

**Headers**:
- `token-id`: JWT token for authentication
- `channel`: APP
- `source`: WEB_USER
- `version`: 2021-07-28

**Response**:
- **200 OK**: Facebook is connected
- **404/401**: Facebook not connected or authentication issue

**Use Case**: 
- Check before listing pages
- Verify connection status in UI
- Determine if OAuth flow is needed

---

### 2. List All Facebook Pages
**Purpose**: Get all Facebook pages available to the connected Facebook account

```
GET /integrations/facebook/{locationId}/pages?getAll=true
```

**Query Parameters**:
- `getAll=true`: Returns all available pages (not just connected ones)
- `limit=100`: Optional limit for pagination

**Response Format**:
```json
{
  "pages": [
    {
      "id": "page_id",
      "name": "Page Name",
      "picture": {
        "data": {
          "url": "https://facebook.com/profile_pic.jpg"
        }
      },
      "category": "Business",
      "access_token": "page_access_token",
      "tasks": ["ADVERTISE", "ANALYZE", "CREATE_CONTENT", "MANAGE", "MODERATE"]
    }
  ]
}
```

**Use Case**:
- Display available pages to user
- Let user select which pages to connect
- Show page details (name, picture, permissions)

---

### 3. Attach/Connect Facebook Pages
**Purpose**: Connect selected Facebook pages to the GHL location

```
POST /integrations/facebook/{locationId}/pages
```

**Headers**:
- `content-type`: application/json
- All authentication headers from above

**Request Body**:
```json
{
  "pages": [
    {
      "id": "page_id",
      "name": "Page Name", 
      "picture": "https://facebook.com/profile_pic.jpg",
      "access_token": "page_access_token",
      "category": "Business",
      "tasks": ["ADVERTISE", "ANALYZE", "CREATE_CONTENT", "MANAGE", "MODERATE"]
    }
  ]
}
```

**Response**:
- **201 Created**: Pages successfully attached
- **400 Bad Request**: Invalid page data
- **401 Unauthorized**: Authentication failed

**Use Case**:
- Connect selected pages to GHL
- Enable social media posting for those pages
- Complete the Facebook integration flow

## Complete Integration Flow

1. **Check Connection** → Verify Facebook is connected via OAuth
2. **List Pages** → Show user all available Facebook pages  
3. **Attach Pages** → Connect selected pages to GHL account

## Error Handling

### Common Error Codes:
- **401 Unauthorized**: Invalid or expired JWT token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Facebook not connected or location not found
- **429 Too Many Requests**: Rate limit exceeded (100 requests per 10 seconds)

### Rate Limits (2025):
- **Burst Limit**: 100 requests per 10 seconds per location
- **Daily Limit**: 200,000 requests per day per location

## Security Notes

1. **JWT Token Security**: 
   - Tokens expire (typically 24 hours for session tokens)
   - Use Private Integration tokens for server-to-server
   - Rotate Private Integration tokens every 90 days

2. **Page Access Tokens**:
   - Facebook page access tokens are included in responses
   - Handle securely and don't log in plain text
   - Required for posting to Facebook pages

3. **CORS**:
   - These endpoints support CORS from GHL domains
   - For external applications, use server-side proxy

## Example Location IDs from JWT:
From the provided JWT token, these locations are accessible:
- `lBPqgBowX1CsjHay12LY` (used in examples)
- `yhPOwYFTUXrqoUAspmC`
- `JUTFTny8EXQOSB5NcvAA`
- `wWK68EN4Gfpq5IlJ017N`
- `AcEsOuylUac6V5vOdUYI`
- `rQAqRrplHUXbREF24Q2H`

Each location needs its own Facebook integration setup.