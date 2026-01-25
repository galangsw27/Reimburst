-- Seed Dummy Data for AIRism Reimbursement System
-- This script creates dummy data for testing the Request Module Refactor

-- Clear existing data (optional - uncomment if needed)
-- TRUNCATE TABLE reimbursements CASCADE;
-- TRUNCATE TABLE assets CASCADE;
-- TRUNCATE TABLE projects CASCADE;
-- TRUNCATE TABLE users CASCADE;

-- ============================================
-- 1. INSERT USERS
-- ============================================

-- Insert Lead users
INSERT INTO users (id, email, name, role, status, "leadId", "leadName") VALUES
('lead-001', 'john.lead@airism.com', 'John Lead', 'lead', 'ACTIVE', NULL, NULL),
('lead-002', 'sarah.lead@airism.com', 'Sarah Lead', 'lead', 'ACTIVE', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert Head user
INSERT INTO users (id, email, name, role, status, "leadId", "leadName") VALUES
('head-001', 'michael.head@airism.com', 'Michael Head', 'head', 'ACTIVE', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert Finance user
INSERT INTO users (id, email, name, role, status, "leadId", "leadName") VALUES
('finance-001', 'lisa.finance@airism.com', 'Lisa Finance', 'finance', 'ACTIVE', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert Tester users (assigned to leads)
INSERT INTO users (id, email, name, role, status, "leadId", "leadName") VALUES
('tester-001', 'alice.tester@airism.com', 'Alice Tester', 'tester', 'ACTIVE', 'lead-001', 'John Lead'),
('tester-002', 'bob.tester@airism.com', 'Bob Tester', 'tester', 'ACTIVE', 'lead-001', 'John Lead'),
('tester-003', 'charlie.tester@airism.com', 'Charlie Tester', 'tester', 'ACTIVE', 'lead-002', 'Sarah Lead'),
('tester-004', 'diana.tester@airism.com', 'Diana Tester', 'tester', 'ACTIVE', 'lead-002', 'Sarah Lead'),
('tester-005', 'evan.tester@airism.com', 'Evan Tester', 'tester', 'ACTIVE', 'lead-001', 'John Lead')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. INSERT PROJECTS
-- ============================================

INSERT INTO projects (id, "projectId", name, status, "createdAt", "updatedAt") VALUES
('proj-001', '5-002-079', 'MaxStream', 'ACTIVE', NOW() - INTERVAL '6 months', NOW()),
('proj-002', '5-002-080', 'MyOrbit', 'ACTIVE', NOW() - INTERVAL '5 months', NOW()),
('proj-003', '5-002-081', 'Dunia Games', 'ACTIVE', NOW() - INTERVAL '4 months', NOW()),
('proj-004', '5-002-082', 'Legacy Project', 'INACTIVE', NOW() - INTERVAL '12 months', NOW() - INTERVAL '6 months')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. INSERT ASSETS
-- ============================================

INSERT INTO assets (id, "assetNumber", description, "registrationDate", "createdBy", status, "createdAt", "updatedAt") VALUES
('asset-001', 'AST-2024-001', 'Laptop Dell XPS 15', NOW() - INTERVAL '3 months', 'tester-001', 'ACTIVE', NOW() - INTERVAL '3 months', NOW()),
('asset-002', 'AST-2024-002', 'iPhone 14 Pro', NOW() - INTERVAL '2 months', 'tester-002', 'ACTIVE', NOW() - INTERVAL '2 months', NOW()),
('asset-003', 'AST-2024-003', 'MacBook Pro M2', NOW() - INTERVAL '4 months', 'tester-003', 'ACTIVE', NOW() - INTERVAL '4 months', NOW()),
('asset-004', 'AST-2024-004', 'Samsung Galaxy S23', NOW() - INTERVAL '1 month', 'tester-004', 'ACTIVE', NOW() - INTERVAL '1 month', NOW()),
('asset-005', 'AST-2024-005', 'iPad Air', NOW() - INTERVAL '2 months', 'tester-005', 'ACTIVE', NOW() - INTERVAL '2 months', NOW()),
('asset-006', 'AST-2023-099', 'Old Laptop', NOW() - INTERVAL '12 months', 'tester-001', 'INACTIVE', NOW() - INTERVAL '12 months', NOW() - INTERVAL '6 months')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. INSERT REIMBURSEMENTS
-- ============================================

-- Pending requests (waiting for lead approval)
INSERT INTO reimbursements (
    id, "employeeName", "employeeEmail", "userId", date, amount, description, 
    project, status, "createdAt", "updatedAt", "leadId", "leadName"
) VALUES
('reimb-001', 'Alice Tester', 'alice.tester@airism.com', 'tester-001', '2024-01-15', 150000, 
 'Pembelian alat tulis kantor untuk project MaxStream', 'MaxStream', 'pending', 
 NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 'lead-001', 'John Lead'),
 
('reimb-002', 'Bob Tester', 'bob.tester@airism.com', 'tester-002', '2024-01-16', 250000, 
 'Biaya transportasi meeting client', 'MyOrbit', 'pending', 
 NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'lead-001', 'John Lead'),
 
('reimb-003', 'Charlie Tester', 'charlie.tester@airism.com', 'tester-003', '2024-01-17', 180000, 
 'Makan siang team meeting', 'Dunia Games', 'pending', 
 NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours', 'lead-002', 'Sarah Lead')
ON CONFLICT (id) DO NOTHING;

-- Approved by lead (waiting for head approval)
INSERT INTO reimbursements (
    id, "employeeName", "employeeEmail", "userId", date, amount, description, 
    project, status, "createdAt", "updatedAt", "leadId", "leadName", approvals
) VALUES
('reimb-004', 'Diana Tester', 'diana.tester@airism.com', 'tester-004', '2024-01-14', 320000, 
 'Pembelian software license', 'MaxStream', 'approved_by_lead', 
 NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', 'lead-002', 'Sarah Lead',
 '{"lead": {"approved": true, "by": "lead-002", "date": "2024-01-15T10:00:00Z", "comment": "Approved"}}'::jsonb),
 
('reimb-005', 'Evan Tester', 'evan.tester@airism.com', 'tester-005', '2024-01-13', 450000, 
 'Biaya perjalanan dinas ke Surabaya', 'MyOrbit', 'approved_by_lead', 
 NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days', 'lead-001', 'John Lead',
 '{"lead": {"approved": true, "by": "lead-001", "date": "2024-01-14T14:30:00Z", "comment": "Approved"}}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Approved by head (waiting for finance approval)
INSERT INTO reimbursements (
    id, "employeeName", "employeeEmail", "userId", date, amount, description, 
    project, status, "createdAt", "updatedAt", "leadId", "leadName", approvals
) VALUES
('reimb-006', 'Alice Tester', 'alice.tester@airism.com', 'tester-001', '2024-01-12', 280000, 
 'Pembelian peralatan testing', 'MaxStream', 'approved_by_head', 
 NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day', 'lead-001', 'John Lead',
 '{"lead": {"approved": true, "by": "lead-001", "date": "2024-01-13T09:00:00Z", "comment": "Approved"}, "head": {"approved": true, "by": "head-001", "date": "2024-01-14T11:00:00Z", "comment": "Approved"}}'::jsonb),
 
('reimb-007', 'Bob Tester', 'bob.tester@airism.com', 'tester-002', '2024-01-11', 195000, 
 'Biaya internet dan komunikasi', 'Dunia Games', 'approved_by_head', 
 NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day', 'lead-001', 'John Lead',
 '{"lead": {"approved": true, "by": "lead-001", "date": "2024-01-12T10:00:00Z", "comment": "Approved"}, "head": {"approved": true, "by": "head-001", "date": "2024-01-13T15:00:00Z", "comment": "Approved"}}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Fully approved (approved by finance)
INSERT INTO reimbursements (
    id, "employeeName", "employeeEmail", "userId", date, amount, description, 
    project, status, "createdAt", "updatedAt", "leadId", "leadName", approvals
) VALUES
('reimb-008', 'Charlie Tester', 'charlie.tester@airism.com', 'tester-003', '2024-01-10', 350000, 
 'Pembelian hardware untuk development', 'MaxStream', 'approved_by_finance', 
 NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 hour', 'lead-002', 'Sarah Lead',
 '{"lead": {"approved": true, "by": "lead-002", "date": "2024-01-11T09:00:00Z", "comment": "Approved"}, "head": {"approved": true, "by": "head-001", "date": "2024-01-12T10:00:00Z", "comment": "Approved"}, "finance": {"approved": true, "by": "finance-001", "date": "2024-01-13T14:00:00Z", "comment": "Approved and processed"}}'::jsonb),
 
('reimb-009', 'Diana Tester', 'diana.tester@airism.com', 'tester-004', '2024-01-09', 420000, 
 'Biaya training dan sertifikasi', 'MyOrbit', 'approved_by_finance', 
 NOW() - INTERVAL '8 days', NOW() - INTERVAL '2 hours', 'lead-002', 'Sarah Lead',
 '{"lead": {"approved": true, "by": "lead-002", "date": "2024-01-10T08:00:00Z", "comment": "Approved"}, "head": {"approved": true, "by": "head-001", "date": "2024-01-11T09:00:00Z", "comment": "Approved"}, "finance": {"approved": true, "by": "finance-001", "date": "2024-01-12T13:00:00Z", "comment": "Approved and processed"}}'::jsonb),
 
('reimb-010', 'Evan Tester', 'evan.tester@airism.com', 'tester-005', '2024-01-08', 275000, 
 'Pembelian buku dan referensi teknis', 'Dunia Games', 'approved_by_finance', 
 NOW() - INTERVAL '9 days', NOW() - INTERVAL '3 hours', 'lead-001', 'John Lead',
 '{"lead": {"approved": true, "by": "lead-001", "date": "2024-01-09T10:00:00Z", "comment": "Approved"}, "head": {"approved": true, "by": "head-001", "date": "2024-01-10T11:00:00Z", "comment": "Approved"}, "finance": {"approved": true, "by": "finance-001", "date": "2024-01-11T14:00:00Z", "comment": "Approved and processed"}}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Rejected requests
INSERT INTO reimbursements (
    id, "employeeName", "employeeEmail", "userId", date, amount, description, 
    project, status, "createdAt", "updatedAt", "leadId", "leadName", "rejectionReason", approvals
) VALUES
('reimb-011', 'Alice Tester', 'alice.tester@airism.com', 'tester-001', '2024-01-07', 500000, 
 'Pembelian laptop pribadi', 'MaxStream', 'rejected', 
 NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', 'lead-001', 'John Lead',
 'Item tidak sesuai dengan kebijakan reimbursement perusahaan',
 '{"lead": {"approved": false, "by": "lead-001", "date": "2024-01-08T10:00:00Z", "comment": "Rejected - not company related"}}'::jsonb),
 
('reimb-012', 'Bob Tester', 'bob.tester@airism.com', 'tester-002', '2024-01-06', 800000, 
 'Biaya entertainment pribadi', 'MyOrbit', 'rejected', 
 NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days', 'lead-001', 'John Lead',
 'Tidak ada bukti transaksi yang valid',
 '{"lead": {"approved": false, "by": "lead-001", "date": "2024-01-07T09:00:00Z", "comment": "Rejected - no valid receipt"}}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- More requests for different projects
INSERT INTO reimbursements (
    id, "employeeName", "employeeEmail", "userId", date, amount, description, 
    project, status, "createdAt", "updatedAt", "leadId", "leadName"
) VALUES
('reimb-013', 'Charlie Tester', 'charlie.tester@airism.com', 'tester-003', '2024-01-18', 165000, 
 'Biaya parkir dan tol perjalanan dinas', 'MaxStream', 'pending', 
 NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours', 'lead-002', 'Sarah Lead'),
 
('reimb-014', 'Diana Tester', 'diana.tester@airism.com', 'tester-004', '2024-01-18', 220000, 
 'Pembelian accessories untuk testing', 'MyOrbit', 'pending', 
 NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours', 'lead-002', 'Sarah Lead'),
 
('reimb-015', 'Evan Tester', 'evan.tester@airism.com', 'tester-005', '2024-01-18', 310000, 
 'Biaya subscription tools development', 'Dunia Games', 'pending', 
 NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', 'lead-001', 'John Lead')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUMMARY
-- ============================================

SELECT 'Data seeding completed!' as message;

SELECT 'Users:' as category, COUNT(*) as count FROM users
UNION ALL
SELECT 'Projects:', COUNT(*) FROM projects
UNION ALL
SELECT 'Assets:', COUNT(*) FROM assets
UNION ALL
SELECT 'Reimbursements:', COUNT(*) FROM reimbursements;

SELECT 
    'Reimbursement Status Summary:' as summary,
    status,
    COUNT(*) as count
FROM reimbursements
GROUP BY status
ORDER BY status;
