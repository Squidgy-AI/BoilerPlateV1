# 📸 GHL Snapshot Share Link Creator

This module creates share links for GoHighLevel snapshots, allowing you to share snapshots with different access levels.

## 🚀 Quick Start

### Step 1: Find Your Snapshot ID
```bash
python list_snapshots.py
```
This will list all your snapshots and their IDs.

### Step 2: Create Share Link
Update `SNAPSHOT_ID` in `create_snapshot_configured.py`, then run:
```bash
python create_snapshot_configured.py
```

## 📁 Files

### 1. `list_snapshots.py`
Lists all available snapshots in your GHL account to find snapshot IDs.

### 2. `create_snapshot_configured.py`
Pre-configured script to create share links with your credentials.

### 3. `create_snapshot_share_link.py`
Full-featured class for creating various types of share links.

## 🔐 Share Link Types

### 1. **Standard Link** (`link`)
Basic share link with standard expiration.

### 2. **Permanent Link** (`permanent_link`)
Never expires - best for long-term sharing.

### 3. **Agency Link** (`agency_link`)
Restricted to specific agencies by relationship number.

### 4. **Location Link** (`location_link`)
Restricted to specific sub-accounts/locations.

## 🔧 Configuration

Current configuration (update in scripts if needed):
```python
AGENCY_TOKEN = "pit-e3d8d384-00cb-4744-8213-b1ab06ae71fe"
COMPANY_ID = "lp2p1q27DrdGta1qGDJd"
LOCATION_ID = "lBPqgBowX1CsjHay12LY"  # Nestle LLC - SOMA TEST
```

## 📋 API Details

**Endpoint**: `POST https://services.leadconnectorhq.com/snapshots/share/link`

**Required Headers**:
- `Authorization`: Bearer token (agency level)
- `Version`: 2021-07-28
- `Content-Type`: application/json

**Request Body**:
```json
{
  "snapshot_id": "your_snapshot_id",
  "share_type": "permanent_link",
  "relationship_number": "0-128-926,1-208-926",  // For agency_link
  "share_location_id": "loc1,loc2"              // For location_link
}
```

**Response** (201 Created):
```json
{
  "id": "share_link_id",
  "shareLink": "https://affiliates.gohighlevel.com/?share=share_link_id"
}
```

## 🎯 Usage Examples

### Create Permanent Link
```python
result = await create_snapshot_share_link(
    snapshot_id="your_snapshot_id",
    share_type="permanent_link"
)
```

### Create Location-Restricted Link
```python
result = await create_snapshot_share_link(
    snapshot_id="your_snapshot_id",
    share_type="location_link",
    location_ids=["lBPqgBowX1CsjHay12LY"]
)
```

### Create Agency-Restricted Link
```python
result = await create_snapshot_share_link(
    snapshot_id="your_snapshot_id",
    share_type="agency_link",
    agency_numbers=["0-128-926", "1-208-926"]
)
```

## 🛠️ Requirements

- Python 3.7+
- httpx
- asyncio

Install dependencies:
```bash
pip install httpx asyncio
```

## 📝 Notes

1. **Token Type**: Requires agency-level token with snapshot permissions
2. **Snapshot ID**: Must be a valid snapshot ID from your account
3. **Share Links**: Generated links can be shared with others to import snapshots
4. **Restrictions**: Agency/location restrictions only work with appropriate share types

## 🔍 Troubleshooting

### "Invalid token" error
- Ensure you're using an agency-level token
- Check token has snapshot permissions

### "Snapshot not found" error
- Verify snapshot ID is correct
- Use `list_snapshots.py` to find valid IDs

### No snapshots listed
- Create a snapshot first in GHL Settings → Snapshots
- Check token permissions

## 🎉 Success Example

When successful, you'll get a share link like:
```
https://affiliates.gohighlevel.com/?share=1eM2UgkfaECOYyUdCo9Pa
```

Share this link with others to let them import your snapshot!