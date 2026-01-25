-- Enhancement Flow Migration Rollback Script
-- This script rolls back the enhancement flow migration changes
-- WARNING: This will remove all data in the new tables!

-- ============================================================================
-- ROLLBACK WARNING
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'WARNING: This rollback script will:';
    RAISE NOTICE '1. DROP new tables: projects, assets, documents';
    RAISE NOTICE '2. REMOVE new columns from users and reimbursements tables';
    RAISE NOTICE '3. REVERT user roles back to original values';
    RAISE NOTICE '4. DELETE all data in the new tables';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Starting rollback at %', NOW();
END $$;

-- ============================================================================
-- 1. REMOVE NEW COLUMNS FROM EXISTING TABLES
-- ============================================================================

-- Remove new columns from reimbursements table
ALTER TABLE reimbursements
DROP COLUMN IF EXISTS project_id,
DROP COLUMN IF EXISTS asset_id,
DROP COLUMN IF EXISTS validation_errors;

-- Remove status column from users table
ALTER TABLE users
DROP COLUMN IF EXISTS status;

-- Revert user roles back to original values
UPDATE users 
SET role = 'user' 
WHERE role = 'tester';

-- Restore original role constraint
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('head', 'finance', 'lead', 'user'));

-- ============================================================================
-- 2. DROP NEW TABLES
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;

-- Drop tables (CASCADE will remove foreign key constraints)
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- ============================================================================
-- 3. REMOVE INDEXES
-- ============================================================================

-- Note: Indexes on dropped tables are automatically removed
-- Remove indexes that were added to existing tables
DROP INDEX IF EXISTS idx_users_status;
DROP INDEX IF EXISTS idx_reimbursements_project_id;
DROP INDEX IF EXISTS idx_reimbursements_asset_id;

-- ============================================================================
-- 4. VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were dropped
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('projects', 'assets', 'documents')
ORDER BY table_name;

-- Verify columns were removed
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND (
        (table_name = 'users' AND column_name = 'status') OR
        (table_name = 'reimbursements' AND column_name IN ('project_id', 'asset_id', 'validation_errors'))
    )
ORDER BY table_name, column_name;

-- Verify role values were reverted
SELECT DISTINCT role FROM users ORDER BY role;

-- Verify indexes were removed
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname IN (
        'idx_projects_project_id', 'idx_projects_status', 'idx_projects_name',
        'idx_assets_asset_number', 'idx_assets_status', 'idx_assets_created_by', 'idx_assets_registration_date',
        'idx_documents_request_id', 'idx_documents_system_filename', 'idx_documents_is_used', 'idx_documents_uploaded_at',
        'idx_users_status', 'idx_reimbursements_project_id', 'idx_reimbursements_asset_id'
    )
ORDER BY tablename, indexname;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Enhancement Flow Migration rollback completed at %', NOW();
    RAISE NOTICE 'Removed tables: projects, assets, documents';
    RAISE NOTICE 'Removed columns: users.status, reimbursements.project_id, reimbursements.asset_id, reimbursements.validation_errors';
    RAISE NOTICE 'Reverted user roles: tester -> user';
    RAISE NOTICE 'Removed enhancement-specific indexes';
    RAISE NOTICE 'Database restored to pre-enhancement state';
END $$;