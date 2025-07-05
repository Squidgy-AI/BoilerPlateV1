# 🎯 Facebook OAuth Implementation Guide

Based on HighLevel support ticket #2861180 and dev team guidance.

## ✅ **Current Status**
- ✅ Test environment created with correct `window.open()` implementation
- ✅ Pre-configured with Nestle sub-account credentials  
- ✅ Ready for testing with real Facebook account

## 🚀 **Next Steps**

### 1. **Test the OAuth Flow**
```
Click: file:///Users/somasekharaddakula/CascadeProjects/SquidgyFrontend/Code/squidgy-frontend/test-facebook-oauth/index.html
```

### 2. **Validate Each Step:**
- [ ] OAuth window opens correctly
- [ ] Facebook login works
- [ ] postMessage received with account data
- [ ] Facebook pages can be fetched
- [ ] Pages can be attached successfully

### 3. **Once Testing is Complete, Integrate Into Main App**

## 🔧 **Key Integration Points for Main App**

### A. **OAuth Initiation (Replace fetch with window.open)**
```javascript
// ❌ OLD (incorrect):
const response = await fetch(oauthUrl, { headers: { Authorization: 'Bearer ...' } });

// ✅ NEW (correct per HighLevel dev team):
const popup = window.open(oauthUrl, 'FacebookOAuthWindow', 'width=600,height=700,...');
```

### B. **postMessage Listener (Add to main app)**
```javascript
window.addEventListener('message', (event) => {
    if (event.data && event.data.page === 'social_media_posting') {
        const { actionType, accountId, platform } = event.data;
        if (actionType === 'close' && accountId) {
            // Handle successful OAuth
            handleFacebookOAuthSuccess(accountId, platform);
        }
    }
}, false);
```

### C. **Subsequent API Calls (Keep existing fetch approach)**
```javascript
// ✅ These still use fetch() with Authorization headers:

// Fetch Facebook Pages:
fetch(`/social-media-posting/oauth/${locationId}/facebook/accounts/${accountId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
});

// Attach Facebook Pages:
fetch(`/social-media-posting/oauth/${locationId}/facebook/accounts/${accountId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(pageData)
});
```

## 📋 **Integration Checklist**

### Frontend Changes:
- [ ] Add Facebook OAuth button to UI
- [ ] Replace OAuth fetch with `window.open()`
- [ ] Add global postMessage listener
- [ ] Add OAuth result handling
- [ ] Add page selection UI
- [ ] Add page attachment logic

### Backend Changes:
- [ ] Verify OAuth endpoints work
- [ ] Test page fetching API
- [ ] Test page attachment API
- [ ] Add error handling

### Testing:
- [ ] Test with real Facebook account
- [ ] Verify permissions are granted correctly
- [ ] Confirm pages are attached properly
- [ ] Test error scenarios

## 🎯 **Expected User Flow**

1. **User clicks "Connect Facebook" in your app**
2. **OAuth popup opens** → Facebook login → Permissions granted
3. **Popup closes** → postMessage received → Account ID obtained
4. **Fetch Facebook pages** → Display pages to user
5. **User selects pages** → Attach to HighLevel account
6. **Success!** → Facebook integration complete

## ⚠️ **Important Notes**

- **OAuth must use `window.open()`** - HighLevel dev team confirmed
- **Other APIs use fetch()** - Only OAuth is special
- **Test with real Facebook account** - Required for proper validation
- **Handle popup blockers** - Add user instructions if blocked

## 🔗 **Test URL**
```
file:///Users/somasekharaddakula/CascadeProjects/SquidgyFrontend/Code/squidgy-frontend/test-facebook-oauth/index.html
```

**Start testing, then integrate once validated!**