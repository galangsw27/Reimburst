-- Migration: Add missing columns to reimbursements table
-- Run this script to update existing database with new columns needed by the application

-- ============================================================================
-- ADD MISSING COLUMNS TO REIMBURSEMENTS TABLE
-- ============================================================================

-- Add project_id foreign key column
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id);

-- Add asset_id foreign key column
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS asset_id INTEGER REFERENCES assets(id);

-- Add receipt_image_2 for second receipt image
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS receipt_image_2 TEXT;

-- Add transaction related columns
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255);
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS transaction_time VARCHAR(100);
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100);
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS transaction_amount NUMERIC;

-- Add fee columns
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS admin_fee NUMERIC DEFAULT 0;
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC DEFAULT 0;
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS service_fee NUMERIC DEFAULT 0;
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;

-- Add login_status and by columns
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS login_status VARCHAR(100);
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS "by" VARCHAR(255);

-- Add folder evidence columns
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS folder_evidence TEXT;
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS folder_evidence_2 TEXT;

-- Add validation_errors as array of text
ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS validation_errors TEXT[];

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE (if not already exist)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_reimbursements_project_id ON reimbursements(project_id);
CREATE INDEX IF NOT EXISTS idx_reimbursements_asset_id ON reimbursements(asset_id);

-- ============================================================================
-- UPDATE EXISTING DATA (if needed)
-- ============================================================================

-- Set default values for new numeric columns
UPDATE reimbursements SET admin_fee = 0 WHERE admin_fee IS NULL;
UPDATE reimbursements SET shipping_fee = 0 WHERE shipping_fee IS NULL;
UPDATE reimbursements SET service_fee = 0 WHERE service_fee IS NULL;
UPDATE reimbursements SET discount = 0 WHERE discount IS NULL;

-- Initialize empty JSONB for approvals if null
UPDATE reimbursements SET approvals = '{}'::jsonb WHERE approvals IS NULL;

-- Initialize empty array for validation_errors if null
UPDATE reimbursements SET validation_errors = ARRAY[]::text[] WHERE validation_errors IS NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    -- Check if all columns exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reimbursements' AND column_name = 'project_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reimbursements' AND column_name = 'receipt_image_2'
    ) THEN
        RAISE NOTICE 'Migration completed successfully!';
    ELSE
        RAISE WARNING 'Some columns may not have been added!';
    END IF;
END $$;
