-- Fix invitations table migration - Safe approach
-- This script properly handles the data migration before adding constraints

-- Step 1: Drop existing foreign key constraints
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_sender_id_fkey;
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_recipient_id_fkey;

-- Step 2: Update existing data FIRST (before adding new constraints)
-- Convert existing sender_id from profiles.id to profiles.user_id
UPDATE invitations 
SET sender_id = (
  SELECT user_id 
  FROM profiles 
  WHERE profiles.id = invitations.sender_id::uuid
) 
WHERE sender_id IS NOT NULL 
AND EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = invitations.sender_id::uuid
);

-- Convert existing recipient_id from profiles.id to profiles.user_id  
UPDATE invitations 
SET recipient_id = (
  SELECT user_id 
  FROM profiles 
  WHERE profiles.id = invitations.recipient_id::uuid
) 
WHERE recipient_id IS NOT NULL 
AND EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = invitations.recipient_id::uuid
);

-- Step 3: Clean up any invalid references
-- Set sender_id to NULL if no matching user_id found
UPDATE invitations 
SET sender_id = NULL 
WHERE sender_id IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = invitations.sender_id::uuid
);

-- Remove invalid recipient invitations (these are broken anyway)
DELETE FROM invitations 
WHERE recipient_id IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.user_id = invitations.recipient_id::uuid
);

-- Step 4: Now add the new foreign key constraints
ALTER TABLE invitations 
ADD CONSTRAINT invitations_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES profiles(user_id) ON DELETE SET NULL;

ALTER TABLE invitations 
ADD CONSTRAINT invitations_recipient_id_fkey 
FOREIGN KEY (recipient_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invitations_sender_id ON invitations(sender_id);
CREATE INDEX IF NOT EXISTS idx_invitations_recipient_id ON invitations(recipient_id);
CREATE INDEX IF NOT EXISTS idx_invitations_recipient_email ON invitations(recipient_email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- Step 6: Update RLS policies
DROP POLICY IF EXISTS "Users can view invitations they sent" ON invitations;
DROP POLICY IF EXISTS "Users can view invitations they received" ON invitations;
DROP POLICY IF EXISTS "Users can update invitations they received" ON invitations;
DROP POLICY IF EXISTS "Users can insert invitations" ON invitations;

-- Create new RLS policies using user_id
CREATE POLICY "Users can view invitations they sent" ON invitations
    FOR SELECT USING (sender_id = (SELECT user_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view invitations they received" ON invitations
    FOR SELECT USING (recipient_id = (SELECT user_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update invitations they received" ON invitations
    FOR UPDATE USING (recipient_id = (SELECT user_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert invitations" ON invitations
    FOR INSERT WITH CHECK (sender_id = (SELECT user_id FROM profiles WHERE id = auth.uid()));

-- Step 7: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON invitations TO authenticated;

-- Step 8: Verification queries (run these to check everything worked)
-- Check foreign key constraints
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

-- Check that all invitations have valid references
SELECT 
  COUNT(*) as total_invitations,
  COUNT(sender_id) as invitations_with_sender,
  COUNT(recipient_id) as invitations_with_recipient
FROM invitations;

-- Check for any orphaned references (should return 0)
SELECT COUNT(*) as orphaned_senders
FROM invitations i
LEFT JOIN profiles p ON p.user_id = i.sender_id
WHERE i.sender_id IS NOT NULL AND p.user_id IS NULL;

SELECT COUNT(*) as orphaned_recipients  
FROM invitations i
LEFT JOIN profiles p ON p.user_id = i.recipient_id
WHERE i.recipient_id IS NOT NULL AND p.user_id IS NULL;