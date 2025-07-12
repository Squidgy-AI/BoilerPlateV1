-- Final Secure People Access - Clean implementation
-- Drop existing functions and views first

-- Drop the old function with parameters
DROP FUNCTION IF EXISTS get_connected_people(uuid);

-- Drop the old function without parameters
DROP FUNCTION IF EXISTS get_connected_people();

-- Drop existing view
DROP VIEW IF EXISTS user_connections;

-- Create the secure view
CREATE OR REPLACE VIEW user_connections AS
WITH current_user_info AS (
  SELECT user_id FROM profiles WHERE id = auth.uid()
),
invited_connections AS (
  -- People you've invited who accepted
  SELECT DISTINCT i.recipient_id as connected_user_id
  FROM invitations i, current_user_info cui
  WHERE i.sender_id = cui.user_id
    AND i.status = 'accepted'
    AND i.recipient_id IS NOT NULL
  
  UNION
  
  -- People who invited you and you accepted
  SELECT DISTINCT i.sender_id as connected_user_id
  FROM invitations i, current_user_info cui  
  WHERE i.recipient_id = cui.user_id
    AND i.status = 'accepted'
    AND i.sender_id IS NOT NULL
)
SELECT DISTINCT
  p.id,
  p.user_id,
  p.email,
  p.full_name,
  p.avatar_url,
  p.role,
  p.created_at,
  p.updated_at,
  p.company_id,
  cui.user_id as viewer_user_id,
  'invited' as connection_type
FROM profiles p
CROSS JOIN current_user_info cui
INNER JOIN invited_connections ic ON p.user_id = ic.connected_user_id
WHERE p.user_id != cui.user_id;

-- Grant permissions on the view
GRANT SELECT ON user_connections TO authenticated;

-- Create a new function with a different name to avoid conflicts
CREATE OR REPLACE FUNCTION get_user_connections()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  full_name text,
  avatar_url text,
  role text,
  created_at timestamptz,
  updated_at timestamptz,
  company_id uuid,
  connection_type text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    uc.id,
    uc.user_id,
    uc.email,
    uc.full_name,
    uc.avatar_url,
    uc.role,
    uc.created_at,
    uc.updated_at,
    uc.company_id,
    uc.connection_type
  FROM user_connections uc
  ORDER BY uc.full_name;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_connections TO authenticated;

-- Test the implementation
SELECT 'Test: Current user' as info, user_id, email FROM profiles WHERE id = auth.uid();
SELECT 'Test: Connected people count' as info, COUNT(*) as count FROM user_connections;
SELECT 'Test: Sample connections' as info, full_name, email FROM user_connections LIMIT 3;