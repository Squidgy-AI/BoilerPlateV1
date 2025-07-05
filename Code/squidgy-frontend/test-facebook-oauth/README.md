# Facebook OAuth Integration Test

This is a standalone test environment for the Facebook OAuth integration flow based on **official HighLevel dev team guidance**.

## ⚠️ **CRITICAL: HighLevel Dev Team Guidance**

Based on support ticket #2861180, the HighLevel dev team confirmed:

> **"The API should not be called using fetch or regular http. It should be opened with Window.open() as mentioned in the API description."**

### ✅ **Correct Implementation (Used in this test):**
```javascript
const url = `${config.baseUrl}/oauth/facebook/start?locationId=${locationId}&userId=${userId}`;
const target = 'FacebookOAuthWindow';
const features = 'toolbar=no,menubar=no,scrollbars=no,resizable=no,location=no,directories=no,status=no';
window.open(url, target, features);
```

### ❌ **Incorrect Implementation (Don't use):**
```javascript
// DON'T DO THIS - Won't work!
fetch(url, { headers: { Authorization: 'Bearer ...' } })
```

### 🔄 **OAuth Flow (as per HighLevel):**
1. `window.open()` opens Facebook OAuth
2. User logs into Facebook and grants permissions  
3. Original window closes
4. **New window opens** with `opener.postMessage` containing account details
5. Listen for the postMessage event with account data

## 🎯 Test Flow

1. **Configuration**: Enter your Nestle sub-account credentials
2. **OAuth**: Open Facebook OAuth popup and complete login
3. **Account Data**: Receive account information via postMessage
4. **Fetch Pages**: Retrieve available Facebook pages
5. **Attach Pages**: Select and attach pages to your account

## 🚀 How to Run

1. **Open the test page**:
   ```
   file:///Users/somasekharaddakula/CascadeProjects/SquidgyFrontend/Code/squidgy-frontend/test-facebook-oauth/index.html
   ```

2. **Or use a local server** (recommended):
   ```bash
   cd /Users/somasekharaddakula/CascadeProjects/SquidgyFrontend/Code/squidgy-frontend/test-facebook-oauth
   python3 -m http.server 8080
   ```
   Then open: `http://localhost:8080`

## 🔧 Pre-filled Configuration

The test is pre-configured with your Nestle sub-account credentials:

- **Bearer Token**: `pit-98e16ccd-8c1e-4e6f-a96d-57ef6cb2cf62`
- **Location ID**: `lBPqgBowX1CsjHay12LY`
- **User ID**: `2Qrex2UBhbp5j2bhOw7A`

## 📋 Testing Steps

### Step 1: Start OAuth
- Click "🚀 Start Facebook OAuth"
- A popup window will open to Facebook
- Complete the Facebook login and permissions

### Step 2: Listen for OAuth Response
The page will automatically listen for this message:
```javascript
{
  actionType: "close",
  page: "social-media-posting", 
  platform: "facebook",
  placement: "placement",
  accountId: "658a9b6833b91e0ecb8f3958",
  reconnectAccounts: ["658a9b6833b91e0ecb834acd"]
}
```

### Step 3: Fetch Facebook Pages
- Click "📄 Fetch Facebook Pages" 
- This calls: `GET /social-media-posting/oauth/{locationId}/facebook/accounts/{accountId}`

### Step 4: Select and Attach Pages
- Select which Facebook pages you want to integrate
- Click "✅ Attach Selected Pages"
- This calls: `POST /social-media-posting/oauth/{locationId}/facebook/accounts/{accountId}`

## 🐛 Debug Features

- **Real-time logging**: See all API calls and responses
- **Step-by-step progress**: Visual indicators for each stage
- **Error handling**: Clear error messages for troubleshooting
- **Console logs**: Detailed technical information

## 📁 Files

- `index.html`: Main test interface
- `facebook-oauth-test.js`: Complete OAuth flow logic
- `README.md`: This documentation

## 🔗 API Endpoints Used

1. **Start OAuth**: `https://services.leadconnectorhq.com/social-media-posting/oauth/facebook/start`
2. **Get Pages**: `https://services.leadconnectorhq.com/social-media-posting/oauth/{locationId}/facebook/accounts/{accountId}`
3. **Attach Pages**: `https://services.leadconnectorhq.com/social-media-posting/oauth/{locationId}/facebook/accounts/{accountId}`

## ⚠️ Important Notes

- This test environment is completely separate from your main application
- No code changes will be pushed to your main repository
- Use this to validate the OAuth flow before integration
- Test with your actual Facebook account to verify permissions

## 🎮 Ready to Test!

Open this URL in your browser to start testing:
**file:///Users/somasekharaddakula/CascadeProjects/SquidgyFrontend/Code/squidgy-frontend/test-facebook-oauth/index.html**