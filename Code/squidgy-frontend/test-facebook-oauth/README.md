# 🚀 Complete Facebook Pages Viewer for GoHighLevel

**One-click solution for business users to view and manage Facebook page integrations with GoHighLevel**

## 🎯 What This Does

This automated script provides a complete Facebook integration analysis for your GoHighLevel account:

- ✅ **Automatic Login**: Opens incognito browser and logs into GHL automatically
- ✅ **JWT Token Extraction**: Captures authentication tokens from browser requests
- ✅ **Facebook Connection Testing**: Tests all Facebook API endpoints
- ✅ **Page Discovery**: Shows ALL your Facebook pages with detailed information
- ✅ **Connection Status**: Displays which pages are connected to GHL
- ✅ **Auto-Attachment**: Automatically connects unconnected pages
- ✅ **Business Summary**: Provides clear, actionable insights

## 🚀 Quick Start

### 1. Setup (One Time)

```bash
# Install dependencies
pip install playwright httpx asyncio

# Install browser engines
playwright install
```

### 2. Configure Your Credentials

Open `complete_facebook_viewer.py` and update around line 110:

```python
self.credentials = {
    'email': 'your-ghl-email@example.com',        # Your GoHighLevel email
    'password': 'your-ghl-password'               # Your GoHighLevel password
}

self.location_id = "your-location-id-here"        # Your GHL Location ID
```

**How to find your Location ID:**
1. Login to GoHighLevel
2. Look at the URL: `app.gohighlevel.com/location/YOUR_LOCATION_ID/dashboard`
3. Copy the location ID from the URL

### 3. Run the Script

```bash
python complete_facebook_viewer.py
```

That's it! The script will:
- Start automatically after 3 seconds
- Open an incognito browser window
- Handle login and MFA (approve on mobile if prompted)
- Show complete Facebook integration analysis

## 📊 What You'll See

### Step 1: Automatic Login
- Browser opens in incognito mode
- Credentials auto-filled
- MFA handling (approve on mobile)
- JWT token extraction

### Step 2: Token Analysis
- Token validity and expiration
- User and company information
- Available locations and permissions

### Step 3: Facebook Integration Testing
- **Connection Status**: Whether Facebook is connected to GHL
- **Available Pages**: All Facebook pages in your account
- **Connected Pages**: Pages currently attached to GHL
- **Auto-Attachment**: Connects any unconnected pages

### Step 4: Detailed Logging
- Complete JSON responses from all API calls
- Response times and status codes
- Detailed page information including IDs, names, URLs
- Facebook permissions and scopes

## 🎯 Business Value

- **🔍 Visibility**: Know exactly which Facebook pages you have
- **📊 Status**: See which pages are connected to GHL for marketing
- **✅ Verification**: Confirm your Facebook integration is working
- **🚀 Automation**: No technical knowledge required
- **💼 Efficiency**: One click shows everything you need

## 🛠️ Technical Details

- **Browser Automation**: Uses Playwright for reliable browser control
- **Fresh Sessions**: Incognito mode ensures clean login every time
- **JWT Extraction**: Captures Firebase authentication tokens automatically
- **API Testing**: Tests 4 different Facebook endpoints comprehensively
- **Error Handling**: Graceful handling of login issues and network problems

## 📝 API Endpoints Tested

1. **GET** `/integrations/facebook/{locationId}/connection` - Connection status
2. **GET** `/integrations/facebook/{locationId}/allPages` - All available pages
3. **GET** `/integrations/facebook/{locationId}/pages` - Currently connected pages
4. **POST** `/integrations/facebook/{locationId}/pages` - Attach pages (if needed)

## 🔧 Troubleshooting

**Script fails to start:**
- Ensure Playwright is installed: `playwright install`
- Check internet connection
- Verify credentials are updated in the script

**Login issues:**
- Approve MFA prompts quickly when they appear
- Check that your GHL credentials are correct
- Try running the script again (sometimes network timing issues occur)

**No pages found:**
- Verify you have Facebook pages in your Facebook account
- Check that Facebook is connected in your GHL dashboard
- Ensure your location ID is correct

## 🚨 Security Notes

- **Never commit credentials**: Always update credentials locally only
- **Use environment variables**: For production use, load credentials from env vars
- **Monitor access**: This script uses your actual GHL login credentials
- **Incognito mode**: Sessions are isolated and cleaned automatically

## 📁 File Structure

```
test-facebook-oauth/
├── complete_facebook_viewer.py    # ⭐ Main script - run this
├── README.md                      # This documentation
├── business_user_login.py         # Alternative login-only script
├── demo_business_login.py         # Demo version
└── test_with_token.py             # Manual token testing
```

## 🎉 Success Output Example

```
✅ Facebook Connection: CONNECTED (15 scopes)
✅ Available Pages: 1 page found
   - "Testing Test Business" (ID: 736138742906375)
✅ Connected Pages: 1 page connected to GHL
✅ All tests passed - Facebook integration working perfectly!
```

## 👨‍💻 Developer Notes

- Built with Python 3.7+
- Uses async/await for concurrent operations
- Comprehensive error handling and logging
- Business-user friendly output formatting
- Extensible design for additional endpoints

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all dependencies are installed
3. Ensure credentials and location ID are correct
4. Try running the script multiple times (network issues can be transient)

---

**Author**: Claude Code Assistant  
**Version**: 1.0  
**Last Updated**: July 2025

**🎯 Perfect for business users who want to understand and verify their Facebook integration with GoHighLevel without any technical complexity!**