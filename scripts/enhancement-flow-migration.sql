-- Enhancement Flow Migration Script
-- This script adds new tables and columns for the enhancement flow features
-- Run this script to update existing database with new schema

-- ============================================================================
-- 1. CREATE CORE TABLES
-- ============================================================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('tester', 'lead', 'head', 'finance')),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    lead_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) UNIQUE NOT NULL, -- Format: 5-002-079
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assets Table
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
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(255),
    original_filename VARCHAR(255) NOT NULL,
    system_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reimbursements Table
CREATE TABLE IF NOT EXISTS reimbursements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    employee_name VARCHAR(255),
    employee_email VARCHAR(255),
    amount NUMERIC NOT NULL,
    description TEXT,
    project VARCHAR(255),
    project_id INTEGER REFERENCES projects(id),
    asset_id INTEGER REFERENCES assets(id),
    date VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    receipt_image TEXT,
    asset VARCHAR(255),
    approvals JSONB DEFAULT '{}',
    rejection_reason TEXT,
    lead_id INTEGER,
    lead_name VARCHAR(255),
    validation_errors TEXT[],
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approval_date TIMESTAMP,
    transaction_id VARCHAR(255),
    transaction_time VARCHAR(100),
    payment_method VARCHAR(100),
    transaction_amount NUMERIC,
    admin_fee NUMERIC DEFAULT 0,
    shipping_fee NUMERIC DEFAULT 0,
    service_fee NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    login_status VARCHAR(100),
    "by" VARCHAR(255),
    folder_evidence TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_projects_project_id ON projects(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_assets_asset_number ON assets(asset_number);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_reimbursements_project_id ON reimbursements(project_id);
CREATE INDEX IF NOT EXISTS idx_reimbursements_asset_id ON reimbursements(asset_id);
CREATE INDEX IF NOT EXISTS idx_reimbursements_status ON reimbursements(status);

-- ============================================================================
-- 3. UTILITY FUNCTIONS & TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reimbursements_updated_at BEFORE UPDATE ON reimbursements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
