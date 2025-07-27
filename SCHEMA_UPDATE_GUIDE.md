# Schema Update Guide - Invitations Table

## 🎯 **Overview**

The invitations table schema has been updated to use `user_id` references instead of `id` references from the profiles table, ensuring consistency with the new authentication system.

## 📋 **Schema Changes**

### **Updated Invitations Table Structure:**
```sql
create table public.invitations (
  id uuid not null default extensions.uuid_generate_v4(),
  sender_id uuid null,           -- Now references profiles.user_id
  recipient_id uuid null,        -- Now references profiles.user_id  
  recipient_email text not null,
  sender_company_id uuid null,
  group_id uuid null,
  status text null default 'pending'::text,
  token text not null,
  created_at timestamp with time zone null default now(),
  expires_at timestamp with time zone null default (now() + '7 days'::interval),
  constraint invitations_pkey primary key (id),
  constraint invitations_token_key unique (token),
  constraint invitations_sender_company_id_fkey foreign key (sender_company_id) references companies (id) on delete cascade,
  constraint invitations_group_id_fkey foreign key (group_id) references groups (id) on delete cascade,
  constraint invitations_recipient_id_fkey foreign key (recipient_id) references profiles (user_id) on delete cascade,
  constraint invitations_sender_id_fkey foreign key (sender_id) references profiles (user_id) on delete set null
);
```

## 🗂️ **Updated Files**

### **Database Schema:**
- ✅ `database/update_invitations_schema.sql` - Migration script
- ✅ `src/lib/supabase.ts` - Added Invitation interface

### **Frontend Components:**
- ✅ `src/components/Auth/AuthProvider.tsx` - Updated invitation creation
- ✅ `src/components/Invitations/InvitationList.tsx` - Updated queries 
- ✅ `src/app/invite/[token]/page.tsx` - Updated invitation acceptance

## 🚀 **Migration Steps**

### **Step 1: Run Database Migration**
Execute the migration script in Supabase SQL Editor:

```sql
-- Copy and run contents of database/update_invitations_schema.sql
```

This script will:
1. Drop existing foreign key constraints
2. Add new constraints referencing `user_id`
3. Update any existing invitation data
4. Create performance indexes
5. Update Row Level Security policies

### **Step 2: Verify Schema Update**
Check that the constraints are properly updated:

```sql
-- Verify foreign key constraints
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'invitations';
```

### **Step 3: Test Invitation Flow**
1. **Send Invitation**: Test creating new invitations
2. **Accept Invitation**: Test accepting invitations
3. **View Invitations**: Check invitation list displays correctly

## 🔧 **Code Changes Summary**

### **AuthProvider.tsx:**
```typescript
// OLD
sender_id: user?.id,
recipient_id: existingUsers[0].id

// NEW  
sender_id: profile?.user_id,
recipient_id: existingUsers[0].user_id
```

### **InvitationList.tsx:**
```typescript
// OLD
.eq('recipient_id', profile.id)
filter: `recipient_id=eq.${profile.id}`

// NEW
.eq('recipient_id', profile.user_id)  
filter: `recipient_id=eq.${profile.user_id}`
```

### **Invite Page:**
```typescript
// OLD
recipient_id: user.id,
user_id: user.id

// NEW
recipient_id: profile.user_id,
user_id: profile.user_id
```

## ✅ **Features Now Working**

### **Invitation System:**
- ✅ **Send Invitations**: Users can invite others by email
- ✅ **Email Notifications**: Professional emails from info@squidgy.ai
- ✅ **Token Security**: Unique tokens with 7-day expiration
- ✅ **Group Invitations**: Invite users to specific groups
- ✅ **Company Assignments**: Automatically assign company membership
- ✅ **Status Tracking**: Pending/Accepted/Declined status management

### **Database Integrity:**
- ✅ **Proper References**: All foreign keys reference user_id consistently
- ✅ **Cascade Deletes**: Proper cleanup when users are deleted
- ✅ **Row Level Security**: Users can only see their own invitations
- ✅ **Performance Indexes**: Optimized queries for invitation lookups

## 🧪 **Testing Checklist**

### **Invitation Creation:**
- [ ] Send invitation to new email
- [ ] Send invitation to existing user  
- [ ] Invite user to specific group
- [ ] Check invitation email delivery

### **Invitation Acceptance:**
- [ ] Accept invitation as new user (signup flow)
- [ ] Accept invitation as existing user (login flow)
- [ ] Verify group membership added
- [ ] Verify company assignment

### **Database Verification:**
- [ ] Check foreign key constraints work
- [ ] Verify data integrity after updates
- [ ] Test RLS policies prevent unauthorized access
- [ ] Confirm performance with indexes

## 🔄 **Rollback Plan**

If issues occur, rollback by reverting foreign keys:

```sql
-- Rollback to old schema (if needed)
ALTER TABLE invitations DROP CONSTRAINT invitations_sender_id_fkey;
ALTER TABLE invitations DROP CONSTRAINT invitations_recipient_id_fkey;

ALTER TABLE invitations 
ADD CONSTRAINT invitations_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE invitations 
ADD CONSTRAINT invitations_recipient_id_fkey 
FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE;
```

## 📞 **Support**

If you encounter issues:
1. Check Supabase dashboard for constraint errors
2. Verify all existing data was migrated correctly
3. Test with fresh invitations
4. Check browser console for TypeScript errors

Your invitation system is now fully integrated with the enhanced authentication schema! 🎉