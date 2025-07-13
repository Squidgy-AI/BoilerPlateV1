# Facebook Integration Status - Backend

## ✅ CURRENT STATE: WORKING BUT HARDCODED

### What Works Now:
- ✅ Browser automation with Playwright
- ✅ Enhanced 2FA service with Gmail IMAP
- ✅ JWT token extraction from GoHighLevel
- ✅ Facebook Pages API integration
- ✅ Database storage (squidgy_facebook_pages)
- ✅ In-memory status caching
- ✅ Production-ready Heroku deployment

### 🔧 HARDCODED CREDENTIALS (Working):
```python
# Current hardcoded override in main.py run_facebook_integration()
fb_request = FacebookPagesRequest(
    location_id='rlRJ1n5Hoy3X53WDOJlq',  # HARDCODED
    user_id='MHwz5yMaG0JrTfGXjvxB',     # HARDCODED  
    email='somashekhar34+rlRJ1n5H@gmail.com',  # HARDCODED
    password='Dummy@123',               # HARDCODED
    firm_user_id=request.get('firm_user_id', '80b957fc-de1d-4f28-920c-41e0e2e28e5e'),
)

# Gmail 2FA configuration in enhanced_2fa_service.py
class GmailEmailConfig:
    def __init__(self, location_id: str = None):
        self.email_address = "somashekhar34+rlRJ1n5H@gmail.com"  # HARDCODED
        self.email_password = "ytmfxlelgyojxjmf"  # HARDCODED
```

### 🎯 WORKING ENDPOINTS:
```bash
POST /api/facebook/integrate              # Starts integration
GET  /api/facebook/integration-status/{id} # Gets cached status  
GET  /api/facebook/pages/{id}             # Direct DB access
POST /api/facebook/integration-status/reset # Clears cache
POST /api/facebook/connect-page           # Connects selected pages
```

## 🎯 NEXT PHASE: DYNAMIC SUB-ACCOUNT INTEGRATION

### Required Changes:

#### 1. **Remove Hardcoded Overrides:**
```python
# In main.py run_facebook_integration() - REMOVE THIS:
# fb_request = FacebookPagesRequest(
#     location_id='rlRJ1n5Hoy3X53WDOJlq',  # Remove hardcoded
#     user_id='MHwz5yMaG0JrTfGXjvxB',     # Remove hardcoded
#     email='somashekhar34+rlRJ1n5H@gmail.com',  # Remove hardcoded
#     password='Dummy@123',               # Remove hardcoded
# )

# REPLACE WITH:
fb_request = FacebookPagesRequest(
    location_id=request.get('location_id'),    # Use dynamic
    user_id=request.get('user_id'),           # Use dynamic
    email=request.get('email'),               # Use dynamic  
    password=request.get('password'),         # Use dynamic
    firm_user_id=request.get('firm_user_id'),
)
```

#### 2. **Dynamic GHL Sub-Account Creation:**
```python
@app.post("/api/ghl/create-subaccount-and-user")
async def create_subaccount_and_user(request: dict):
    """
    Creates new GHL sub-account with unique credentials
    Returns: {location_id, user_id, user_email, user_password}
    """
    # Use existing implementation but ensure unique credentials
    # Generate unique email: user+{random}@domain.com
    # Generate secure password
    # Return credentials for Facebook integration
```

#### 3. **Enhanced 2FA Service Dynamic Config:**
```python
class GmailEmailConfig:
    def __init__(self, user_email: str, app_password: str = None):
        # Use dynamic user email instead of hardcoded
        self.email_address = user_email  # From sub-account creation
        self.email_password = app_password or os.environ.get("GMAIL_2FA_APP_PASSWORD")
        
    @classmethod
    def from_subaccount(cls, subaccount_data: dict):
        """Create config from dynamic sub-account data"""
        return cls(
            user_email=subaccount_data['user_email'],
            app_password=subaccount_data.get('gmail_app_password')
        )
```

#### 4. **Integration Flow Update:**
```python
async def run_facebook_integration(request: dict):
    """Updated to use dynamic credentials from sub-account creation"""
    
    # Get credentials from request (created by sub-account API)
    location_id = request.get('location_id')
    user_id = request.get('user_id') 
    email = request.get('email')
    password = request.get('password')
    
    # Validate required credentials
    if not all([location_id, user_id, email, password]):
        raise ValueError("Missing required credentials from sub-account")
    
    # Use dynamic credentials for Facebook integration
    fb_request = FacebookPagesRequest(
        location_id=location_id,
        user_id=user_id,
        email=email,
        password=password,
        firm_user_id=request.get('firm_user_id')
    )
    
    # Configure 2FA service with dynamic email
    gmail_config = GmailEmailConfig(user_email=email)
    enhanced_2fa = Enhanced2FAService(gmail_config)
    
    # Rest of integration flow remains same
```

### Files That Need Updates:
- [ ] `main.py` - Remove hardcoded credential overrides  
- [ ] `enhanced_2fa_service.py` - Support dynamic email configuration
- [ ] `facebook_pages_api_working.py` - Ensure dynamic credential support
- [ ] Database schema - Store per-user integration credentials

### API Flow Changes:
```bash
# New Dynamic Flow:
1. POST /api/ghl/create-subaccount-and-user (user business info)
   → Returns: {location_id, user_id, email, password}

2. POST /api/facebook/integrate (dynamic credentials from step 1)
   → Uses dynamic credentials instead of hardcoded

3. GET /api/facebook/integration-status/{dynamic_location_id}
   → Returns status for user's specific sub-account
```

---

## 📝 COMMIT MESSAGE:
**"WORKING: Facebook integration complete with hardcoded credentials"**

**Current Status:** Fully functional Facebook integration with browser automation, 2FA, and database persistence.

**Next Phase:** Remove hardcoded credentials and implement dynamic sub-account creation for scalable multi-user deployments.

**Production Ready:** ✅ (with single hardcoded account)
**Multi-User Ready:** ❌ (requires dynamic credential implementation)