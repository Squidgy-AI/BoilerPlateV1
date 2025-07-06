# 🚀 Complete Guide: Facebook Integration with GoHighLevel

**Two different approaches for Facebook integration - choose what works best for you!**

## 📋 Quick Comparison

| Feature | JWT Method | OAuth Method |
|---------|------------|--------------|
| **Complexity** | ⭐⭐⭐ Medium | ⭐⭐⭐⭐ Advanced |
| **Setup Time** | 5 minutes | 15 minutes |
| **Technical Knowledge** | Minimal | Some required |
| **Business User Friendly** | ✅ Excellent | ⭐⭐⭐ Good |
| **Production Ready** | ✅ Yes | ✅ Yes |
| **Facebook Compliance** | ✅ Yes | ✅ Yes (Preferred) |
| **Long-term Tokens** | ⭐⭐⭐ Session-based | ✅ Yes |
| **External App Support** | ❌ GHL only | ✅ Any application |

---

## 🎯 Method 1: JWT Token Approach (Recommended for Business Users)

### What It Does:
- **Automated browser login** to GoHighLevel
- **Extracts JWT tokens** from browser network requests  
- **Tests all Facebook APIs** with detailed logging
- **Shows all your Facebook pages** with connection status
- **Connects unconnected pages** automatically

### Perfect For:
- ✅ Business users who want **zero technical complexity**
- ✅ Quick Facebook integration **verification**
- ✅ **One-click analysis** of Facebook connection status
- ✅ **Troubleshooting** Facebook integration issues

### How to Use:

#### 1. Run the Main Script:
```bash
python complete_facebook_viewer.py
```

#### 2. Configure Your Credentials:
```python
# Edit around line 110 in complete_facebook_viewer.py
self.credentials = {
    'email': 'your-ghl-email@example.com',
    'password': 'your-ghl-password'
}
self.location_id = "your-location-id-here"
```

#### 3. What You'll See:
```
✅ Facebook Connection: CONNECTED (15 scopes)
✅ Available Pages: 1 page found
   - "Your Business Page" (ID: 123456789)
✅ Connected Pages: 1 page connected to GHL
✅ All tests passed - Facebook integration working perfectly!
```

#### 4. Benefits:
- **🔒 Incognito browser** ensures fresh login every time
- **📱 MFA handling** - just approve on your mobile when prompted
- **📊 Detailed logging** shows exactly what's happening
- **🎯 Business-friendly** output with clear next steps
- **⚡ Fast** - complete analysis in under 2 minutes

---

## 🔐 Method 2: OAuth Flow Approach (Recommended for Developers)

### What It Does:
- **Official Facebook OAuth flow** as intended by Facebook
- **Local web server** handles OAuth callbacks
- **Proper permission scopes** and long-term access tokens
- **Production-ready** implementation for external applications

### Perfect For:
- ✅ **Production applications** that need Facebook integration
- ✅ **External tools** that integrate with GoHighLevel
- ✅ **Compliance** with Facebook's OAuth policies
- ✅ **Long-term projects** requiring persistent access

### How to Use:

#### 1. Configure OAuth Script:
```python
# Edit around line 80 in main_oauth_facebook.py
self.bearer_token = "pit-your-bearer-token"  # Private Integration token
self.location_id = "your-location-id"        # GHL Location ID  
self.user_id = "your-user-id"                # GHL User ID
```

#### 2. Run OAuth Flow:
```bash
python main_oauth_facebook.py
```

#### 3. What Happens:
1. **Local server starts** at `http://localhost:8000`
2. **Browser opens** OAuth page automatically
3. **Facebook popup** opens for authorization
4. **OAuth callback** received via postMessage
5. **Facebook pages** fetched and displayed
6. **Selected pages** attached to GHL location

#### 4. Benefits:
- **📋 Official OAuth flow** compliant with Facebook policies
- **🌐 Web interface** guides you through each step
- **🔐 Secure tokens** with proper expiration handling
- **🏗️ Production-ready** code for integration projects
- **📱 Mobile-friendly** OAuth interface

---

## 🛠️ Installation & Dependencies

### For JWT Method:
```bash
# Install dependencies
pip install playwright httpx asyncio

# Install browser engines (one time)
playwright install
```

### For OAuth Method:
```bash
# Install dependencies  
pip install aiohttp aiofiles asyncio httpx
```

### System Requirements:
- **Python 3.7+**
- **Internet connection**
- **Modern web browser** (Chrome, Firefox, Safari, Edge)
- **GoHighLevel account** with Facebook connected

---

## 🔧 Configuration Guide

### Finding Your Location ID:
1. Login to GoHighLevel
2. Look at the URL: `app.gohighlevel.com/location/YOUR_LOCATION_ID/dashboard`
3. Copy the location ID from the URL

### Getting Bearer Token (Private Integration):
1. Go to **GHL Settings** → **Private Integrations**
2. Click **"Create Private Integration"**
3. Fill out the form:
   - **Name**: "Facebook Integration API"
   - **Scopes**: Select all OAuth and social media scopes
4. Copy the generated token (starts with `pit-`)

### Finding User ID:
**Option 1: From JWT Token**
- Use the JWT method first to see your user ID in the output

**Option 2: From GHL API**
```bash
curl -H "Authorization: Bearer YOUR_BEARER_TOKEN" \
     -H "Version: 2021-07-28" \
     https://services.leadconnectorhq.com/users/me
```

---

## 📊 API Endpoints Reference

### JWT Method Endpoints:
```
GET /integrations/facebook/{locationId}/connection
GET /integrations/facebook/{locationId}/allPages?limit=20  
GET /integrations/facebook/{locationId}/pages?getAll=true
POST /integrations/facebook/{locationId}/pages
```

### OAuth Method Endpoints:
```
GET /social-media-posting/oauth/facebook/start
GET /social-media-posting/oauth/{locationId}/facebook/accounts/{accountId}
POST /social-media-posting/oauth/{locationId}/facebook/accounts/{accountId}
```

---

## 🐛 Troubleshooting

### JWT Method Issues:

**Browser doesn't open / Popup blocked:**
- Allow popups for localhost in browser settings
- Try running script again
- Check that Playwright is installed: `playwright install`

**Login fails / MFA issues:**
- Approve MFA prompts quickly when they appear
- Check credentials are correct in the script
- Ensure you have access to the specified location

**No Facebook pages found:**
- Verify Facebook is connected in GHL dashboard
- Check that your Facebook account has pages
- Ensure location ID is correct

### OAuth Method Issues:

**Popup blocked:**
- Allow popups for localhost in browser settings
- Try manually opening `http://localhost:8000`

**OAuth fails:**
- Check bearer token has correct scopes
- Verify location ID and user ID are correct
- Ensure internet connection is stable

**Server won't start:**
- Check if port 8000 is already in use
- Try changing `self.server_port` to different port
- Verify aiohttp is installed

---

## 🔒 Security Best Practices

### For JWT Method:
- **Never commit credentials** to version control
- **Update credentials locally** only in the script
- **Use environment variables** for production deployments
- **JWT tokens expire** automatically (1 hour typically)

### For OAuth Method:
- **Private Integration tokens** should be rotated every 90 days
- **Store bearer tokens securely** (environment variables)
- **Use HTTPS** in production (not localhost)
- **Validate OAuth callbacks** to prevent CSRF attacks

---

## 🎯 Which Method Should You Choose?

### Choose JWT Method If:
- ✅ You're a **business user** wanting to check Facebook integration
- ✅ You need **quick verification** of Facebook connection status
- ✅ You want **minimal technical setup**
- ✅ You're **troubleshooting** Facebook integration issues
- ✅ You need **detailed logging** and analysis

### Choose OAuth Method If:
- ✅ You're building a **production application**
- ✅ You need **external app integration** with GHL
- ✅ You want **official OAuth compliance**
- ✅ You're creating **long-term integrations**
- ✅ You need **proper token management**

---

## 📁 File Structure Summary

```
test-facebook-oauth/
├── complete_facebook_viewer.py    # ⭐ JWT Method - Main business user script
├── main_oauth_facebook.py         # ⭐ OAuth Method - Production OAuth flow
├── README.md                      # Updated documentation
├── COMPLETE_GUIDE.md              # This comprehensive guide
├── business_user_login.py         # JWT extraction only
├── demo_business_login.py         # Demo version with pre-filled data
└── test_with_token.py             # Manual token testing
```

---

## 🎉 Success Stories

### JWT Method Success:
```
🎉 CONGRATULATIONS!
✅ Your Facebook integration is working perfectly
✅ All endpoints are accessible  
✅ You can see all your Facebook pages
✅ All tests passed - Facebook integration working perfectly!
```

### OAuth Method Success:
```
🎉 Integration Completed Successfully!
✅ Pages Attached: 3
✅ Facebook pages are now connected to your GHL location
✅ Use these pages for social media posting in GHL
```

---

**🎯 Both methods are production-ready and will get your Facebook integration working perfectly with GoHighLevel!**

**📞 Need help?** Check the troubleshooting sections above or try the other method if one doesn't work for your setup.

---

**Author**: Claude Code Assistant  
**Version**: 1.0  
**Last Updated**: July 2025