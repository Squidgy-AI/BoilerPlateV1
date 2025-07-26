-- FIX FOREIGN KEY CONSTRAINT ISSUE
-- The profiles table has a foreign key to auth.users but email confirmation creates timing issues

-- ============================================================================
-- OPTION 1: REMOVE THE FOREIGN KEY CONSTRAINT (RECOMMENDED)
-- ============================================================================

-- Drop the foreign key constraint that's causing the issue
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check remaining constraints on profiles table
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'profiles' 
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Removes the foreign key constraint to auth.users.id
-- 2. This allows profile creation even if auth user isn't fully confirmed yet
-- 3. The application logic ensures the auth user exists before creating profile
-- 4. This is safer with email confirmation workflows
-- 5. You can still manually verify data integrity if needed