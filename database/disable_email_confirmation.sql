-- DISABLE EMAIL CONFIRMATION IN SUPABASE
-- This makes signup work immediately without email confirmation

-- Check current auth configuration
SELECT 
    name, 
    setting,
    short_desc
FROM pg_settings 
WHERE name LIKE '%confirm%' 
   OR name LIKE '%email%'
   OR name LIKE '%auth%'
ORDER BY name;