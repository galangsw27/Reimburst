-- Enhancement Flow Migration Script
-- This script adds new tables and columns for the enhancement flow features
-- Run this script to update existing database with new schema

-- ============================================================================
-- 1. CREATE NEW TABLES
-- ============================================================================

-- Projects Table
-- Stores project information with unique project IDs (format: 5-002-079)
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) UNIQUE NOT NULL, -- Format: 5-002-079
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assets Table
-- Master data for asset validation and anti-duplication
-- Asset matching still uses existing n8n webhook
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    asset_number VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    registration_date DATE NOT NULL,
    created_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents Table
-- Metadata tracking for file uploads with anti-duplication
-- Physical files still stored in existing storage system
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    system_filename VARCHAR(255) NOT NULL, -- Format: [sequence]_transaction_id.ext
    file_path TEXT NOT NULL, -- Path in storage system
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    is_used BOOLEAN DEFAULT FALSE, -- Flag for anti-duplication
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. UPDATE EXISTING TABLES
-- ============================================================================

-- Users Table Enhancement
-- Add status column and update role enum to support new roles
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE'));

-- Update role column to support new role values
-- Note: PostgreSQL doesn't allow direct enum modification, so we use VARCHAR
-- New roles: 'tester' (replaces 'user'), 'lead', 'head', 'finance'
-- Existing roles will be mapped: 'user' -> 'tester'
ALTER TABLE users 
ALTER COLUMN role TYPE VARCHAR(20);

-- Remove existing role constraint first
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

-- Update existing 'user' roles to 'tester' to match new role matrix
UPDATE users 
SET role = 'tester' 
WHERE role = 'user';

-- Add constraint for new role values
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('tester', 'lead', 'head', 'finance'));

-- Reimbursements Table Enhancement
-- Add references to new tables and validation fields
ALTER TABLE reimbursements
ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id),
ADD COLUMN IF NOT EXISTS asset_id INTEGER REFERENCES assets(id),
ADD COLUMN IF NOT EXISTS validation_errors TEXT[];

-- ============================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Projects Table Indexes
CREATE INDEX IF NOT EXISTS idx_projects_project_id ON projects(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);

-- Assets Table Indexes
CREATE INDEX IF NOT EXISTS idx_assets_asset_number ON assets(asset_number);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_created_by ON assets(created_by);
CREATE INDEX IF NOT EXISTS idx_assets_registration_date ON assets(registration_date);

-- Documents Table Indexes
CREATE INDEX IF NOT EXISTS idx_documents_request_id ON documents(request_id);
CREATE INDEX IF NOT EXISTS idx_documents_system_filename ON documents(system_filename);
CREATE INDEX IF NOT EXISTS idx_documents_is_used ON documents(is_used);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);

-- Enhanced Users Table Indexes
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Enhanced Reimbursements Table Indexes
CREATE INDEX IF NOT EXISTS idx_reimbursements_project_id ON reimbursements(project_id);
CREATE INDEX IF NOT EXISTS idx_reimbursements_asset_id ON reimbursements(asset_id);

-- ============================================================================
-- 4. UPDATE TRIGGERS FOR NEW TABLES
-- ============================================================================

-- Create triggers to automatically update updated_at for new tables
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. SEED INITIAL DATA (OPTIONAL)
-- ============================================================================

-- Insert sample projects for testing (optional)
INSERT INTO projects (project_id, name, status) VALUES
('5-002-079', 'Sample Project Alpha', 'ACTIVE'),
('5-002-080', 'Sample Project Beta', 'ACTIVE'),
('5-002-081', 'Sample Project Gamma', 'INACTIVE')
ON CONFLICT (project_id) DO NOTHING;

-- Insert sample assets for testing (optional)
-- Use a valid user ID from the users table
INSERT INTO assets (asset_number, description, registration_date, created_by, status) 
SELECT 
    'AST-001-2024', 'Sample Asset 1', '2024-01-01', u.id, 'ACTIVE'
FROM users u 
WHERE u.role = 'head' 
LIMIT 1
ON CONFLICT (asset_number) DO NOTHING;

INSERT INTO assets (asset_number, description, registration_date, created_by, status) 
SELECT 
    'AST-002-2024', 'Sample Asset 2', '2024-01-02', u.id, 'ACTIVE'
FROM users u 
WHERE u.role = 'head' 
LIMIT 1
ON CONFLICT (asset_number) DO NOTHING;

INSERT INTO assets (asset_number, description, registration_date, created_by, status) 
SELECT 
    'AST-003-2024', 'Sample Asset 3', '2024-01-03', u.id, 'INACTIVE'
FROM users u 
WHERE u.role = 'head' 
LIMIT 1
ON CONFLICT (asset_number) DO NOTHING;

-- ============================================================================
-- 6. VERIFICATION QUERIES
-- ============================================================================

-- Verify new tables were created
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('projects', 'assets', 'documents')
ORDER BY table_name;

-- Verify new columns were added
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

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename IN ('projects', 'assets', 'documents', 'users', 'reimbursements')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Verify role updates
SELECT DISTINCT role FROM users ORDER BY role;

-- Count records in new tables
SELECT 
    'projects' as table_name, COUNT(*) as record_count FROM projects
UNION ALL
SELECT 
    'assets' as table_name, COUNT(*) as record_count FROM assets
UNION ALL
SELECT 
    'documents' as table_name, COUNT(*) as record_count FROM documents;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Enhancement Flow Migration completed successfully at %', NOW();
    RAISE NOTICE 'New tables created: projects, assets, documents';
    RAISE NOTICE 'Enhanced tables: users (status), reimbursements (project_id, asset_id, validation_errors)';
    RAISE NOTICE 'Performance indexes created for all tables';
    RAISE NOTICE 'Sample data inserted for testing';
END $$;