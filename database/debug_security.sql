-- Debug Security Issues
-- Run these queries one by one to understand what's happening

-- 1. Check your current user
SELECT 'Your user info' as test, id, user_id, email, full_name FROM profiles WHERE id = auth.uid();

-- 2. Check all invitations in the system
SELECT 'All invitations' as test, sender_id, recipient_id, recipient_email, status FROM invitations;

-- 3. Check invitations you sent
SELECT 'Invitations you sent' as test, recipient_id, recipient_email, status FROM invitations 
WHERE sender_id = (SELECT user_id FROM profiles WHERE id = auth.uid());

-- 4. Check invitations you received  
SELECT 'Invitations you received' as test, sender_id, recipient_email, status FROM invitations
WHERE recipient_id = (SELECT user_id FROM profiles WHERE id = auth.uid());

-- 5. Check what the view is actually returning
SELECT 'View results' as test, user_id, email, full_name FROM user_connections;

-- 6. Check if view exists and permissions
SELECT 'View info' as test, schemaname, viewname, viewowner FROM pg_views WHERE viewname = 'user_connections';

-- 7. Manual query to see what SHOULD be returned
WITH current_user_info AS (
  SELECT user_id FROM profiles WHERE id = auth.uid()
),
accepted_invitations AS (
  SELECT DISTINCT i.recipient_id as connected_user_id
  FROM invitations i, current_user_info cui
  WHERE i.sender_id = cui.user_id AND i.status = 'accepted' AND i.recipient_id IS NOT NULL
  UNION
  SELECT DISTINCT i.sender_id as connected_user_id  
  FROM invitations i, current_user_info cui
  WHERE i.recipient_id = cui.user_id AND i.status = 'accepted' AND i.sender_id IS NOT NULL
)
SELECT 'Manual query results' as test, p.user_id, p.email, p.full_name
FROM profiles p
INNER JOIN accepted_invitations ai ON p.user_id = ai.connected_user_id;

-- 8. Check if there are ANY accepted invitations
SELECT 'Accepted invitations count' as test, COUNT(*) as count FROM invitations WHERE status = 'accepted';