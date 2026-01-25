-- Enhancement Flow Migration Verification Script
-- Run this script to verify the migration was successful

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

\echo '==================================================================='
\echo 'Enhancement Flow Migration Verification'
\echo '==================================================================='

-- 1. Verify new tables exist
\echo ''
\echo '1. Checking new tables...'
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('projects', 'assets', 'documents')
ORDER BY table_name;

-- 2. Verify new columns exist
\echo ''
\echo '2. Checking new columns...'
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND (
        (table_name = 'users' AND column_name = 'status') OR
        (table_name = 'reimbursements' AND column_name IN ('project_id', 'asset_id', 'validation_errors'))
    )
ORDER BY table_name, column_name;

-- 3. Verify indexes exist
\echo ''
\echo '3. Checking performance indexes...'
SELECT 
    tablename,
    indexname
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%'
    AND tablename IN ('projects', 'assets', 'documents', 'users', 'reimbursements')
ORDER BY tablename, indexname;

-- 4. Verify role updates
\echo ''
\echo '4. Checking user roles...'
SELECT 
    role,
    COUNT(*) as user_count
FROM users 
GROUP BY role 
ORDER BY role;

-- 5. Check sample data
\echo ''
\echo '5. Checking sample data...'
SELECT 
    'projects' as table_name, 
    COUNT(*) as record_count,
    COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_count,
    COUNT(CASE WHEN status = 'INACTIVE' THEN 1 END) as inactive_count
FROM projects
UNION ALL
SELECT 
    'assets' as table_name, 
    COUNT(*) as record_count,
    COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_count,
    COUNT(CASE WHEN status = 'INACTIVE' THEN 1 END) as inactive_count
FROM assets
UNION ALL
SELECT 
    'documents' as table_name, 
    COUNT(*) as record_count,
    COUNT(CASE WHEN is_used = false THEN 1 END) as available_count,
    COUNT(CASE WHEN is_used = true THEN 1 END) as used_count
FROM documents;

-- 6. Test foreign key relationships
\echo ''
\echo '6. Testing foreign key relationships...'
SELECT 
    'users.status constraint' as test,
    CASE 
        WHEN EXISTS (SELECT 1 FROM users WHERE status NOT IN ('ACTIVE', 'INACTIVE')) 
        THEN 'FAILED' 
        ELSE 'PASSED' 
    END as result;

SELECT 
    'users.role constraint' as test,
    CASE 
        WHEN EXISTS (SELECT 1 FROM users WHERE role NOT IN ('tester', 'lead', 'head', 'finance')) 
        THEN 'FAILED' 
        ELSE 'PASSED' 
    END as result;

SELECT 
    'projects.status constraint' as test,
    CASE 
        WHEN EXISTS (SELECT 1 FROM projects WHERE status NOT IN ('ACTIVE', 'INACTIVE')) 
        THEN 'FAILED' 
        ELSE 'PASSED' 
    END as result;

SELECT 
    'assets.status constraint' as test,
    CASE 
        WHEN EXISTS (SELECT 1 FROM assets WHERE status NOT IN ('ACTIVE', 'INACTIVE')) 
        THEN 'FAILED' 
        ELSE 'PASSED' 
    END as result;

-- 7. Test unique constraints
\echo ''
\echo '7. Testing unique constraints...'
SELECT 
    'projects.project_id unique' as test,
    CASE 
        WHEN (SELECT COUNT(*) FROM projects) = (SELECT COUNT(DISTINCT project_id) FROM projects)
        THEN 'PASSED' 
        ELSE 'FAILED' 
    END as result;

SELECT 
    'assets.asset_number unique' as test,
    CASE 
        WHEN (SELECT COUNT(*) FROM assets) = (SELECT COUNT(DISTINCT asset_number) FROM assets)
        THEN 'PASSED' 
        ELSE 'FAILED' 
    END as result;

-- 8. Sample project and asset details
\echo ''
\echo '8. Sample data details...'
\echo 'Projects:'
SELECT project_id, name, status FROM projects ORDER BY project_id;

\echo ''
\echo 'Assets:'
SELECT asset_number, description, status, registration_date FROM assets ORDER BY asset_number;

-- 9. Check triggers
\echo ''
\echo '9. Checking triggers...'
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
    AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table, trigger_name;

\echo ''
\echo '==================================================================='
\echo 'Migration Verification Complete'
\echo '==================================================================='