-- DELETE EXISTING USER TO TEST FRESH SIGNUP
-- This will delete the user from auth.users

DELETE FROM auth.users 
WHERE email = 'somasekhar.addakula@gmail.com';

-- Verify deletion
SELECT id, email 
FROM auth.users 
WHERE email = 'somasekhar.addakula@gmail.com';
-- Should return 0 rows