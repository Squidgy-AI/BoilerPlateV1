# Database Updates Required for Facebook Integration

## Summary

Yes, we need database-level updates to support the new GHL Setup and Facebook Integration steps. The main issues are:

1. **New Setup Types**: Add support for `GHLSetup` and `FacebookIntegration` setup types
2. **Data Integrity**: Add constraints to ensure only valid setup types are used
3. **Performance**: Add indexes for the new setup types
4. **Consistency**: Ensure all components use the correct column name (`setup_json`)

## Required Changes

### 1. Database Schema Updates

**File**: `/database/add-facebook-ghl-setup-types.sql`

**Key Changes:**
- Add constraint for new setup types: `GHLSetup`, `FacebookIntegration`
- Add performance indexes for new setup types
- Create a helpful view for querying setup progress
- Add proper documentation/comments

### 2. Column Name Consistency Fixed

**Problem**: Some components were using `setup_data` instead of `setup_json`

**Fixed Files:**
- `EnhancedChatFacebookSetup.tsx` ✅ 
- `EnhancedChatGHLSetup.tsx` ✅

**Database Schema Uses**: `setup_json` (correct)

## Setup Type Values

The database now supports these `setup_type` values:

1. `'agent_config'` - Basic agent configuration (existing)
2. `'SolarSetup'` - Solar business configuration (existing)
3. `'CalendarSetup'` - Calendar and booking setup (existing)
4. `'NotificationSetup'` - Notification preferences (existing)
5. `'GHLSetup'` - **NEW**: GoHighLevel account setup
6. `'FacebookIntegration'` - **NEW**: Facebook OAuth integration

## Database Migration Steps

### Step 1: Run the Migration
Execute the SQL file in your Supabase dashboard:
```sql
-- Copy content from: /database/add-facebook-ghl-setup-types.sql
```

### Step 2: Verify Setup Types
Check that constraints are working:
```sql
SELECT setup_type, COUNT(*) 
FROM public.squidgy_agent_business_setup 
GROUP BY setup_type;
```

### Step 3: Test Setup Progress View
Query the new progress view:
```sql
SELECT * FROM public.user_setup_progress 
WHERE agent_id = 'SOLAgent';
```

## Data Structures

### GHL Setup JSON Structure
```json
{
  "location_id": "GJSb0aPcrBRne73LK3A3",
  "user_id": "utSop6RQjsF2Mwjnr8Gg",
  "location_name": "SolarSetup_Clone_192939",
  "user_name": "Ovi Colton",
  "user_email": "ovi+192940@test-solar.com",
  "setup_status": "completed",
  "created_at": "2025-01-07T20:00:00Z"
}
```

### Facebook Integration JSON Structure
```json
{
  "location_id": "GJSb0aPcrBRne73LK3A3",
  "user_id": "utSop6RQjsF2Mwjnr8Gg",
  "oauth_url": "https://www.facebook.com/v18.0/dialog/oauth?...",
  "integration_status": "connected",
  "connected_at": "2025-01-07T20:00:00Z"
}
```

## Benefits of These Updates

### 1. Data Integrity
- Prevents invalid setup_type values
- Ensures consistent data structure

### 2. Performance
- Indexes speed up queries for specific setup types
- View provides easy access to setup progress

### 3. Maintainability
- Clear separation of different setup stages
- Easy to query and debug setup issues

### 4. Scalability
- Easy to add new setup types in the future
- Consistent pattern for all setup stages

## Testing Queries

### Check User Setup Progress
```sql
SELECT 
  firm_user_id,
  next_step,
  overall_status,
  solar_completed,
  calendar_completed,
  notifications_completed,
  ghl_completed,
  facebook_completed
FROM public.user_setup_progress;
```

### Find Users at Specific Stage
```sql
-- Find users waiting for GHL setup
SELECT firm_user_id 
FROM public.user_setup_progress 
WHERE next_step = 'ghl';

-- Find users waiting for Facebook integration
SELECT firm_user_id 
FROM public.user_setup_progress 
WHERE next_step = 'facebook';
```

### Debug Setup Issues
```sql
-- See all setup records for a specific user
SELECT 
  setup_type,
  is_enabled,
  created_at,
  setup_json
FROM public.squidgy_agent_business_setup 
WHERE firm_user_id = 'user-id-here' 
  AND agent_id = 'SOLAgent'
ORDER BY created_at;
```

## Important Notes

1. **Backward Compatibility**: All existing setup types remain unchanged
2. **No Data Loss**: Migration only adds new constraints and indexes
3. **Production Ready**: Includes proper error handling and rollback options
4. **Performance Impact**: Minimal - only adds indexes which improve performance

## Rollback Plan (If Needed)

If you need to rollback the changes:
```sql
-- Remove constraints
ALTER TABLE public.squidgy_agent_business_setup 
DROP CONSTRAINT IF EXISTS chk_setup_type_values;

-- Remove indexes
DROP INDEX IF EXISTS idx_agent_setup_ghl;
DROP INDEX IF EXISTS idx_agent_setup_facebook;

-- Remove view
DROP VIEW IF EXISTS public.user_setup_progress;
```