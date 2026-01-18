#!/bin/bash

# Script to run database migration for approval tracking
# This adds new columns to support detailed approval workflow

echo "🔄 Running database migration for approval tracking..."
echo ""

# Check if docker container is running
if ! docker ps | grep -q reimbursement_db; then
    echo "❌ Error: Database container 'reimbursement_db' is not running"
    echo "Please start the database first with: docker-compose up -d"
    exit 1
fi

echo "✅ Database container is running"
echo ""

# Run the migration
echo "📝 Executing migration SQL..."
docker exec -i reimbursement_db psql -U postgres -d reimbursement_db <<EOF
-- Add new columns if they don't exist
ALTER TABLE reimbursements 
  ADD COLUMN IF NOT EXISTS employee_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS employee_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS project VARCHAR(100),
  ADD COLUMN IF NOT EXISTS date VARCHAR(50),
  ADD COLUMN IF NOT EXISTS receipt_image TEXT,
  ADD COLUMN IF NOT EXISTS asset VARCHAR(255),
  ADD COLUMN IF NOT EXISTS approvals JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS lead_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_name VARCHAR(255);

-- Update status column to support new status values
ALTER TABLE reimbursements 
  DROP CONSTRAINT IF EXISTS reimbursements_status_check;

ALTER TABLE reimbursements 
  ADD CONSTRAINT reimbursements_status_check 
  CHECK (status IN ('pending', 'approved_by_head', 'approved_by_lead', 'approved_by_finance', 'rejected', 'approved'));

-- Migrate old 'approved' status to 'approved_by_finance'
UPDATE reimbursements 
SET status = 'approved_by_finance' 
WHERE status = 'approved';

-- Update constraint to remove old 'approved' status
ALTER TABLE reimbursements 
  DROP CONSTRAINT reimbursements_status_check;

ALTER TABLE reimbursements 
  ADD CONSTRAINT reimbursements_status_check 
  CHECK (status IN ('pending', 'approved_by_head', 'approved_by_lead', 'approved_by_finance', 'rejected'));

-- Create index for new columns
CREATE INDEX IF NOT EXISTS idx_reimbursements_project ON reimbursements(project);
CREATE INDEX IF NOT EXISTS idx_reimbursements_lead_id ON reimbursements(lead_id);
CREATE INDEX IF NOT EXISTS idx_reimbursements_employee_email ON reimbursements(employee_email);

-- Show table structure
\d reimbursements
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📋 Summary of changes:"
    echo "  - Added employee_name, employee_email columns"
    echo "  - Added project, date, receipt_image columns"
    echo "  - Added asset, approvals (JSONB), rejection_reason columns"
    echo "  - Added lead_id, lead_name columns"
    echo "  - Updated status constraint to support new approval statuses"
    echo "  - Created indexes for better query performance"
    echo ""
    echo "🚀 You can now restart your application!"
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi
