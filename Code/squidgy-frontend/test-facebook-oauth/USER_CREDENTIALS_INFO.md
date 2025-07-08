# 🔐 User Credentials & Configuration Information

## 📋 Created Users

### 1. Jeremy Chen (Admin)
- **User ID:** `Cui6SniagrGEh1FU57Pm`
- **Email:** jeremy.chend@gmail.com
- **Password:** Dummy@123
- **Role:** Admin
- **Phone:** +18332327657

### 2. Ovi Colton (User) - CONFIGURED IN SCRIPTS
- **User ID:** `lE2u2ELCfB2MVlZ9OkDg`
- **Email:** ovi.chand@gmail.com
- **Password:** Dummy@123
- **Role:** User
- **Phone:** +17166044029

## 🏢 GoHighLevel Configuration

### Location Information
- **Location ID:** `lBPqgBowX1CsjHay12LY`
- **Location Name:** Nestle LLC - SOMA TEST
- **Company ID:** `lp2p1q27DrdGta1qGDJd`

### API Tokens
- **Location Access Token:** `pit-519ac848-5b7f-4de4-acd2-bde5065493ee`
- **Agency Token (mentioned):** `pit-c4e9d6af-8956-4a84-9b83-554fb6801a69`

## 🚀 Script Configuration Status

### complete_facebook_viewer.py
✅ **CONFIGURED** with Ovi Colton's credentials:
```python
self.location_id = "lBPqgBowX1CsjHay12LY"
self.credentials = {
    'email': 'ovi.chand@gmail.com',
    'password': 'Dummy@123'
}
```

### main.py (OAuth Backend)
✅ **CONFIGURED** with test endpoint:
```python
test_request = FacebookOAuthRequest(
    locationId="lBPqgBowX1CsjHay12LY",
    userId="6ZHPyo1FRlZNBGzH5szG"  # Different user ID in test endpoint
)
```

### index.html (OAuth Frontend)
✅ **CONFIGURED** with default values:
```html
<input type="text" id="locationId" value="lBPqgBowX1CsjHay12LY" />
<input type="text" id="userId" value="6ZHPyo1FRlZNBGzH5szG" />
```

## 🧪 How to Test

### 1. Test JWT Method (Business User Friendly)
```bash
python complete_facebook_viewer.py
```
This will:
- Login as Ovi Colton automatically
- Extract JWT token
- Test all Facebook endpoints
- Show Facebook pages

### 2. Test OAuth Method (Developer)
```bash
# Terminal 1: Start backend
python main.py

# Terminal 2: Open frontend
# Open index.html in browser
# Click "Start Facebook OAuth"
```

### 3. Test User Creation
The users have already been created. To verify:
```bash
python check_location_info.py
```
This will list all users in the location.

## 📝 Important Notes

1. **Passwords**: All test users use `Dummy@123` as password
2. **Location**: All users are created in "Nestle LLC - SOMA TEST" location
3. **Permissions**: Both users have full permissions enabled
4. **MFA**: Users may need to approve MFA on mobile when logging in

## 🔧 Other User IDs in the System

From the location info query:
1. **Nescafe LLC Soma -Test** - ID: `6ZHPyo1FRlZNBGzH5szG`
2. **Maggie LLC Soma -Test** - ID: `Fj1JPxueiId1Ki15fZZA`
3. **GRAPE LLC Soma -Test** - ID: `KCJnEDXIRDUyCKaFeWSK`
4. **Jeremy Chen** - ID: `Cui6SniagrGEh1FU57Pm` (newly created)
5. **Ovi Colton** - ID: `lE2u2ELCfB2MVlZ9OkDg` (newly created)

## 🎯 Ready to Test!

All scripts are configured and ready to run. The `complete_facebook_viewer.py` script will:
1. Login as Ovi Colton
2. Extract JWT token automatically
3. Test Facebook integration
4. Show all Facebook pages
5. Attempt to connect any unconnected pages

Just run: `python complete_facebook_viewer.py`