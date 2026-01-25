-- Migration script for new approval flow
-- Date: 2026-01-25
-- Description: Add new status values for enhanced approval workflow
--
-- New Flow:
-- pending -> approved_by_lead -> submitted_to_head -> approved_by_head -> submitted_to_finance -> approved_by_finance
--
-- Lead Flow:
--   - Request page: See pending requests from their team members, can approve
--   - Approval page: See approved_by_lead requests, can submit to head
--
-- Head Flow:
--   - Request page: See submitted_to_head requests, can approve
--   - Approval page: See approved_by_head requests, can submit to finance
--
-- Finance Flow:
--   - Request page: See submitted_to_finance requests, can approve (final)

-- Step 1: Drop the existing constraint on status column
ALTER TABLE reimbursements DROP CONSTRAINT IF EXISTS reimbursements_status_check;

-- Step 2: Add new constraint with updated status values
ALTER TABLE reimbursements ADD CONSTRAINT reimbursements_status_check 
CHECK (status IN (
  'pending',              -- User uploaded, waiting for Lead approval
  'approved_by_lead',     -- Lead approved, waiting for Lead to submit to Head
  'submitted_to_head',    -- Lead submitted to Head, waiting for Head approval
  'approved_by_head',     -- Head approved, waiting for Head to submit to Finance
  'submitted_to_finance', -- Head submitted to Finance, waiting for Finance approval
  'approved_by_finance',  -- Finance approved, finished
  'rejected'              -- Rejected at any stage
));

-- Step 3: Optional - Migrate existing data if needed
-- If you have existing 'approved_by_head' that haven't been submitted to finance,
-- you may want to update them to 'submitted_to_finance' or keep as is based on approvals JSONB

-- Example: Update requests that are approved_by_head but not yet approved by finance
-- to submitted_to_finance (assuming they were already submitted in old flow)
-- UPDATE reimbursements 
-- SET status = 'submitted_to_finance' 
-- WHERE status = 'approved_by_head' 
--   AND approvals->'head'->>'approved' = 'true'
--   AND (approvals->'finance'->>'approved' IS NULL OR approvals->'finance'->>'approved' != 'true');

-- Verify the changes
SELECT DISTINCT status, COUNT(*) as count 
FROM reimbursements 
GROUP BY status 
ORDER BY status;
